# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Tika** (Ticket-based Kanban board TODO app) is currently spec-only — this repository contains no source code yet, only the `docs/` directory. There is no `package.json`, no `app/`, no `src/`. Before writing any code, scaffold the Next.js project per the structure in `docs/TRD.md` §3.

Do not invent commands, scripts, or file paths that aren't yet in this repo — check whether the project has been scaffolded first (`ls package.json`). Once scaffolded, this file should be updated with the actual build/lint/test commands from `package.json`.

## Spec documents (read before implementing)

All product and technical decisions are pre-defined in `docs/`. Read the relevant doc before implementing a feature rather than guessing:

- `docs/PRD.md` — product scope, user scenarios, fixed 4-column board layout (Backlog sidebar + TODO/In Progress/Done main grid)
- `docs/TRD.md` — system architecture, full directory structure, layering rules, data flow diagrams
- `docs/REQUIREMENTS.md` — FR-001~008 functional requirements with exact validation error messages, NFRs, user stories (US-001~008), and the US↔FR↔TC traceability matrix
- `docs/API_SPEC.md` — full REST API contract (request/response JSON, error codes, Zod schemas) for all 7 endpoints
- `docs/DATA_MODEL.md` — Drizzle schema, TypeScript types, business rules (position math, startedAt/completedAt automation, overdue/24h-visibility logic), seed data
- `docs/COMPONENT_SPEC.md` — React component tree, props, hooks (`useTickets`), event flows
- `docs/TEST_CASES.md` — TDD test cases (TC-API-*, TC-COMP-*, TC-INT-*) mapped to FRs/user stories, with a 4-phase implementation priority order

When a spec doc conflicts with what you'd otherwise assume (e.g., which API handles a Done-column drag, or when `startedAt`/`completedAt` reset to null), the spec wins. These docs are the source of truth, not example scaffolding.

## Architecture (from TRD.md)

Single Next.js 15 (App Router) project on Vercel with **logical frontend/backend separation by directory**, not by repo:

```
app/api/           # Route Handlers only — request parsing + response, NO business logic
src/server/        # Backend: services/, db/ (Drizzle schema + client), middleware/
src/client/        # Frontend: components/, hooks/ (useTickets), api/ (ticketApi.ts fetch wrapper)
src/shared/        # Types, Zod validation schemas, constants — the ONLY code both sides import
```

Request flow: `Component → src/client/api/ticketApi.ts → app/api/*/route.ts (parse+respond) → src/server/services/ticketService.ts (business logic) → src/server/db/ (Drizzle) → Vercel Postgres`

**Hard boundary rules (TRD.md §7)** — these are the load-bearing constraints of this codebase:
- `src/server/` and `src/client/` must never import from each other; only `src/shared/` is imported by both
- Route Handlers stay thin: parse request → call service → return response. No business logic in `app/api/`
- Components never call `fetch` directly — always go through `src/client/api/ticketApi.ts`
- `src/server/` contains no React/UI code
- When a change touches both sides, edit `src/shared/` first, then propagate

### Single-entity data model

MVP has one table, `tickets` (no auth, single user — see `docs/DATA_MODEL.md` §2-3 for the full Drizzle schema). Key non-obvious business rules to preserve wherever tickets are mutated:

- **Position ordering**: fractional positioning. New/moved cards get `(prev + next) / 2`; if the gap collapses below 1, the whole column is rebalanced to 1024-unit spacing. Top-of-column insert = `min(position) - 1024`.
- **`startedAt`/`completedAt` are system-only fields**, never user-editable. `startedAt` is set when a ticket moves to TODO and cleared when it moves back to BACKLOG. `completedAt` is set only via the dedicated complete endpoint and cleared when a ticket leaves DONE via reorder.
- **Two different endpoints for "moving to Done" vs. everything else**: `PATCH /api/tickets/:id/complete` is the *only* way to move a ticket into DONE; `PATCH /api/tickets/reorder` explicitly rejects `status: "DONE"` and handles all other column/position moves (including moving *out of* DONE). Frontend DnD logic must branch on destination column to pick the right endpoint (see API_SPEC.md "프론트엔드 DnD 라우팅 규칙").
- **`isOverdue` is a derived field**, computed at query time (`dueDate < today && status !== DONE`), never persisted.
- **Done column has a 24-hour visibility window**: `GET /api/tickets` excludes DONE tickets whose `completedAt` is more than 24h old, filtered server-side.
- Dates: `plannedStartDate`/`dueDate` are user-entered `DATE` (YYYY-MM-DD); `startedAt`/`completedAt`/`createdAt`/`updatedAt` are system `TIMESTAMP`. Timezone is Asia/Seoul.

### Validation

Zod schemas live in `src/shared/validations/ticket.ts` and are shared verbatim between client-side form validation and server-side Route Handler validation — do not duplicate validation logic in both places. Exact error message strings are specified in REQUIREMENTS.md and API_SPEC.md and are part of the contract (tests assert on them).

## TDD workflow

`docs/TEST_CASES.md` defines the test cases and a 4-phase build order: (1) core backend API — create/read/reorder/complete, (2) remaining CRUD + overdue + basic components, (3) form/modal components, (4) DnD + full integration. Write the test for a TC ID before implementing the behavior it covers.
