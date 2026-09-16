# Implementation Plan: 칸반 보드 조회 (GET /api/tickets)

**Branch**: `001-board-view` | **Date**: 2026-09-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-board-view/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

전체 티켓을 4개 상태(BACKLOG, TODO, IN_PROGRESS, DONE)별로 그룹화하여
칼럼 내 position 오름차순으로 정렬하고, 각 티켓에 `isOverdue` 파생 필드를
붙여 반환하는 읽기 전용 API(`GET /api/tickets`)를 구현한다. DONE 칼럼은
완료된 지 24시간 이내인 티켓만 노출한다. 기존 `POST /api/tickets` 구현과
동일한 레이어 분리(Route Handler → Service → DB)를 따르며, 새 스키마나
DB 변경은 없다.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 (App Router, Route Handlers), Drizzle
ORM 0.38.x, `postgres`(postgres-js)

**Storage**: PostgreSQL (`tickets` 테이블, 기존 스키마 재사용 — 변경 없음)

**Testing**: Jest (`__tests__/api/`), `@jest-environment node`, 실제
tika_test DB 사용한 통합 테스트 (기존 `tickets.test.ts` 패턴)

**Target Platform**: Vercel Serverless Functions (Node.js 20.x)

**Project Type**: Web application (Next.js App Router, 프론트/백엔드 디렉토리
수준 분리)

**Performance Goals**: SC-001 (1초 이내 보드 표시), SC-002 (티켓 1000건에서도
지연 없음) — 기존 인덱스(`idx_tickets_status_position`)로 충족 가능, 별도
캐싱/페이지네이션 불필요 (MVP 규모)

**Constraints**: 쿼리 파라미터 없음(API_SPEC.md §2), 인증 없음(단일 사용자)

**Scale/Scope**: 단일 엔드포인트(`GET /api/tickets`), 신규 DB 변경 없음,
신규 의존성 없음

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | 적용 여부 | 판정 |
|---|---|---|
| I. TypeScript Strict Mode | 적용 | PASS — 기존 tsconfig strict 설정 그대로 사용, `any` 미사용 예정 |
| II. API Contract Fidelity | 적용 | PASS — 응답 형식(`{ board, total }`)을 API_SPEC.md §2와 정확히 일치시킴 (contracts/get-tickets.md로 재확인) |
| III. Error Response Format | 적용 | PASS — 이 엔드포인트는 사용자 입력 오류 케이스가 없어 400 경로는 없음; 500 발생 시에도 `{ error: { code, message } }` 형식 유지 |
| IV. Request Validation with Zod | 조건부 적용 | PASS — 요청 바디/쿼리가 없어 검증 대상 자체가 없음 (research.md Decision 1에 근거 기록) |
| V. Service Layer Separation | 적용 | PASS — 그룹화/오버듀/24시간 필터 로직을 `ticketService.ts`의 `getBoard()` 함수로 분리, Route Handler는 호출과 응답만 담당 |

**Initial Gate Result**: PASS. 위반 없음 — Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/001-board-view/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── get-tickets.md   # Phase 1 output
├── checklists/
│   └── requirements.md  # /speckit-specify output
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

```text
tika/
├── app/api/tickets/
│   └── route.ts                        # GET 함수 추가 (기존 POST와 같은 파일)
├── src/
│   ├── server/
│   │   └── services/
│   │       └── ticketService.ts        # getBoard() 함수 추가 (기존 create()와 같은 파일)
│   └── shared/
│       └── types/
│           └── index.ts                # TicketWithMeta, BoardData (이미 정의됨, 변경 없음)
└── __tests__/
    └── api/
        └── tickets.test.ts             # GET 시나리오 테스트 추가 (기존 POST 테스트와 같은 파일,
                                         # 또는 tickets-get.test.ts로 분리 — /speckit-tasks에서 결정)
```

**Structure Decision**: 기존 `POST /api/tickets` 구현이 사용한 구조(Web
application, `app/api/` + `src/server/` + `src/shared/` 분리, CLAUDE.md
"프로젝트 구조" 참조)를 그대로 따른다. 같은 리소스(`/api/tickets`)에 대한
새 HTTP 메서드이므로 새 디렉토리를 만들지 않고 기존 `route.ts`와
`ticketService.ts`에 함수를 추가하는 것이 Next.js App Router 컨벤션과
constitution Principle V에 부합한다.

## Complexity Tracking

*No violations — table intentionally omitted (constitution.md Constitution Check 통과, 정당화할 위반 없음).*
