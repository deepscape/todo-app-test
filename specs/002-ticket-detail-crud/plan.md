# Implementation Plan: 티켓 상세 조회/수정/삭제

**Branch**: `002-ticket-detail-crud` | **Date**: 2026-09-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-ticket-detail-crud/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

단일 티켓 리소스에 대한 상세 조회(`GET /api/tickets/:id`), 부분 수정
(`PATCH /api/tickets/:id`), 영구 삭제(`DELETE /api/tickets/:id`)를
구현한다. 세 엔드포인트 모두 존재하지 않는 id에 대해 `404
TICKET_NOT_FOUND`를 반환하며, PATCH는 `status`/`position`/`startedAt`/
`completedAt`을 변경하지 못하도록 막는다. 기존 `POST`/`GET
/api/tickets` 구현과 동일한 레이어 분리(Route Handler → Service → DB)를
따른다.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 (App Router, Route Handlers, 동적
세그먼트 `[id]`), Drizzle ORM 0.38.x, Zod 3.x

**Storage**: PostgreSQL (`tickets` 테이블, 스키마 변경 없음)

**Testing**: Jest (`__tests__/api/`), 실제 tika_test DB 통합 테스트
(기존 `tickets.test.ts` 패턴)

**Target Platform**: Vercel Serverless Functions (Node.js 20.x)

**Project Type**: Web application (기존 001-board-view와 동일 구조)

**Performance Goals**: SC-001 (id 조회 1초 이내) — PK 조회이므로 별도
인덱스 불필요 (기본 PK 인덱스로 충분)

**Constraints**: 인증 없음(단일 사용자), 하드 삭제(복구 불가)

**Scale/Scope**: 3개 엔드포인트, 신규 DB 변경 없음, 신규 npm 의존성 없음

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | 적용 여부 | 판정 |
|---|---|---|
| I. TypeScript Strict Mode | 적용 | PASS — 기존 strict 설정 유지, `any` 미사용 |
| II. API Contract Fidelity | 적용 | PASS — 응답 형식을 API_SPEC.md §3/4/6과 정확히 일치 (contracts/ticket-detail.md로 재확인) |
| III. Error Response Format | 적용 | PASS — 404/400 모두 `{ error: { code, message } }` 형식 유지 |
| IV. Request Validation with Zod | 적용 | PASS — PATCH 바디는 `updateTicketSchema`(Zod)로 검증. path parameter(id)는 Zod 대상이 아니므로 Route Handler에서 간단한 타입 가드로 검증 (research.md Decision 1에 근거) |
| V. Service Layer Separation | 적용 | PASS — 조회/수정/삭제 로직을 `ticketService.ts`의 `getById()`, `update()`, `remove()`로 분리, Route Handler는 호출과 응답만 담당 |

**Initial Gate Result**: PASS. 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/002-ticket-detail-crud/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ticket-detail.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
tika/
├── app/api/tickets/
│   ├── route.ts                        # 기존 GET/POST (변경 없음)
│   └── [id]/
│       └── route.ts                    # 신규: GET/PATCH/DELETE 추가
├── src/
│   ├── server/
│   │   └── services/
│   │       └── ticketService.ts        # getById(), update(), remove() 추가
│   └── shared/
│       └── validations/
│           └── ticket.ts               # updateTicketSchema 추가
└── __tests__/
    └── api/
        └── tickets-detail.test.ts      # 신규 테스트 파일
```

**Structure Decision**: Next.js App Router 동적 세그먼트 컨벤션에 따라
`app/api/tickets/[id]/route.ts`를 신규 생성한다 (기존
`app/api/tickets/route.ts`와 분리 — 경로가 다르므로 별도 파일이 Next.js
표준). Service/Validation은 기존 파일에 함수를 추가하는 방식으로 001과
동일한 패턴을 따른다.

## Complexity Tracking

*No violations — table intentionally omitted.*
