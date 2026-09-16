# Implementation Plan: 티켓 완료 처리

**Branch**: `003-ticket-complete` | **Date**: 2026-09-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-ticket-complete/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

`PATCH /api/tickets/:id/complete`를 구현한다. 요청 바디 없이 티켓 id만으로
해당 티켓을 완료(DONE) 상태로 전환하고, 완료 시각을 현재 시각으로 기록하며,
완료 칼럼 맨 위(`min(position) - 1024`)에 배치한다. 없는 id는 404를
반환한다. 기존 `create()`의 position 계산 로직을 일반화해 재사용한다.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 (App Router, 중첩 동적 세그먼트
`[id]/complete`), Drizzle ORM 0.38.x

**Storage**: PostgreSQL (`tickets` 테이블, 스키마 변경 없음)

**Testing**: Jest (`__tests__/api/`), 실제 tika_test DB 통합 테스트

**Target Platform**: Vercel Serverless Functions (Node.js 20.x)

**Project Type**: Web application (기존 001/002와 동일 구조)

**Performance Goals**: SC-001 (1초 이내 반영) — PK 조회 + 단일 UPDATE로
충분

**Constraints**: 인증 없음, 요청 바디 없음(research.md Decision 2)

**Scale/Scope**: 1개 엔드포인트, 신규 DB 변경 없음, 신규 npm 의존성 없음

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | 적용 여부 | 판정 |
|---|---|---|
| I. TypeScript Strict Mode | 적용 | PASS |
| II. API Contract Fidelity | 적용 | PASS — API_SPEC.md §5와 정확히 일치 (contracts/ticket-complete.md) |
| III. Error Response Format | 적용 | PASS — 404/400 모두 `{ error: { code, message } }` |
| IV. Request Validation with Zod | 해당 없음 | PASS — 요청 바디 없음(research.md Decision 2), 001-board-view GET과 동일 근거 |
| V. Service Layer Separation | 적용 | PASS — `ticketService.ts`의 `complete()`로 분리, Route Handler는 호출/응답만 |

**Initial Gate Result**: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/003-ticket-complete/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ticket-complete.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
tika/
├── app/api/tickets/
│   ├── route.ts                        # 변경 없음
│   └── [id]/
│       ├── route.ts                    # 변경 없음 (GET/PATCH/DELETE)
│       └── complete/
│           └── route.ts                # 신규: PATCH
├── src/
│   └── server/
│       └── services/
│           └── ticketService.ts        # complete() 추가,
│                                        # nextBacklogPosition → nextTopPosition(status) 일반화
└── __tests__/
    └── api/
        └── tickets-complete.test.ts    # 신규
```

**Structure Decision**: Next.js App Router 컨벤션에 따라
`app/api/tickets/[id]/complete/route.ts`를 신규 생성한다 (기존
`.gitkeep`이 이미 이 경로를 예약해둠). Service는 기존 파일에 함수를
추가하고, position 계산 헬퍼를 일반화하여 `create()`와 `complete()`가
공유하도록 리팩터링한다 (research.md Decision 1).

## Complexity Tracking

*No violations — table intentionally omitted.*
