# Implementation Plan: 티켓 순서/상태 변경 (reorder)

**Branch**: `004-ticket-reorder` | **Date**: 2026-09-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-ticket-reorder/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

`PATCH /api/tickets/reorder`를 구현한다. 티켓을 BACKLOG/TODO/IN_PROGRESS
중 한 칼럼의 지정된 인덱스 위치로 원자적으로 이동시키고, position을
재계산하며(간격 부족 시 칼럼 전체 재정렬), 이동 방향에 따라 startedAt/
completedAt을 자동 관리한다. DONE은 상태 값으로 거부된다. 전체 처리는
Drizzle 트랜잭션으로 원자성을 보장한다.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 (App Router), Drizzle ORM 0.38.x
(트랜잭션 API), Zod 3.x

**Storage**: PostgreSQL (`tickets` 테이블, 스키마 변경 없음)

**Testing**: Jest (`__tests__/api/`), 실제 tika_test DB 통합 테스트

**Target Platform**: Vercel Serverless Functions (Node.js 20.x)

**Project Type**: Web application (기존 001~003과 동일 구조)

**Performance Goals**: SC-001 (1초 이내 반영) — 재정렬이 필요한 경우도
단일 트랜잭션 내 UPDATE 여러 건으로 처리, 칼럼당 티켓 수가 MVP
규모(수십~수백)라 성능 문제 없음

**Constraints**: 인증 없음, 요청 `position`은 배열 인덱스로 해석
(research.md Decision 1, 사용자 확인 완료)

**Scale/Scope**: 1개 엔드포인트, 신규 DB 변경 없음, 신규 npm 의존성
없음(Drizzle 트랜잭션은 기존 의존성에 포함)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | 적용 여부 | 판정 |
|---|---|---|
| I. TypeScript Strict Mode | 적용 | PASS |
| II. API Contract Fidelity | 적용 | PASS — API_SPEC.md §7과 일치. 단, position 필드 의미는 명세에 명시되지 않아 사용자 확인을 거쳐 확정(research.md Decision 1) — API_SPEC.md 자체 수정은 이 기능의 범위 밖이므로 진행하지 않음 |
| III. Error Response Format | 적용 | PASS — 400/404 모두 `{ error: { code, message } }` |
| IV. Request Validation with Zod | 적용 | PASS — `reorderTicketSchema`로 검증, DONE은 열거형 자체로 차단 |
| V. Service Layer Separation | 적용 | PASS — `ticketService.ts`의 `reorder()`로 트랜잭션/비즈니스 로직 분리, Route Handler는 호출/응답만 |

**Initial Gate Result**: PASS. Principle II에 경미한 리스크(명세 모호성)가
있으나, 근거를 명시하고 사용자 확인을 거쳤으므로 진행한다.

## Project Structure

### Documentation (this feature)

```text
specs/004-ticket-reorder/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ticket-reorder.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
tika/
├── app/api/tickets/
│   └── reorder/
│       └── route.ts                    # 신규: PATCH
├── src/
│   ├── server/
│   │   └── services/
│   │       └── ticketService.ts        # reorder() 추가
│   └── shared/
│       └── validations/
│           └── ticket.ts               # reorderTicketSchema 추가
└── __tests__/
    └── api/
        └── tickets-reorder.test.ts     # 신규
```

**Structure Decision**: `app/api/tickets/reorder/route.ts`는 이미
`.gitkeep`으로 예약된 경로에 신규 생성한다. Service/Validation은 기존
파일에 함수를 추가하는 001~003과 동일한 패턴을 따른다.

## Complexity Tracking

*No violations — table intentionally omitted.*
