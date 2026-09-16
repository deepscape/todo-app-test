---

description: "Task list for GET/PATCH/DELETE /api/tickets/:id (티켓 상세 조회/수정/삭제)"
---

# Tasks: 티켓 상세 조회/수정/삭제

**Input**: Design documents from `/specs/002-ticket-detail-crud/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ticket-detail.md, quickstart.md

**Tests**: TDD(Red-Green-Refactor)를 이 프로젝트의 표준 워크플로우로 사용한다
(constitution.md "Development Workflow & Quality Gates", 001-board-view와
동일한 패턴).

**Organization**: spec.md의 3개 User Story(GET 상세조회 P1, PATCH 수정 P1,
DELETE 삭제 P2)를 기준으로 구성한다. 세 엔드포인트가 모두
`app/api/tickets/[id]/route.ts` 한 파일에 공존하고, PATCH/DELETE가
"티켓이 존재하는가"라는 조회 로직(`getById`)을 공유하므로, US1(GET)에서
`getById()`를 먼저 만들고 US2/US3에서 재사용한다.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

- `app/api/tickets/[id]/route.ts` — 신규 Route Handler (GET/PATCH/DELETE)
- `src/server/services/ticketService.ts` — 기존 파일에 함수 추가
- `src/shared/validations/ticket.ts` — 기존 파일에 `updateTicketSchema` 추가
- `__tests__/api/tickets-detail.test.ts` — 신규 테스트 파일

---

## Phase 1: Setup

**Purpose**: 신규 의존성/마이그레이션 없음 (plan.md 참조). 회귀 기준선만
확인한다.

- [X] T001 `npm run test -- __tests__/api/tickets.test.ts`로 001-board-view의
      기존 20개 테스트가 현재 통과 상태인지 확인한다 (회귀 기준선, 파일
      변경 없음)

**Checkpoint**: 기준선 확인 완료

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 세 엔드포인트가 공유하는 검증 스키마(`updateTicketSchema`)를
먼저 정의한다.

**⚠️ CRITICAL**: 이 단계 완료 전에는 User Story 작업을 시작하지 않는다

- [X] T002 `src/shared/validations/ticket.ts`에 `updateTicketSchema`를
      추가한다 (data-model.md "UpdateTicketInput" 표 그대로,
      API_SPEC.md §457 updateTicketSchema 기준):
      `title`: `z.string().min(1, '제목을 입력해주세요').max(200, '제목은
      200자 이내로 입력해주세요').refine(val => val.trim().length > 0,
      '제목을 입력해주세요').optional()`,
      `description`: `z.string().max(1000, '설명은 1000자 이내로
      입력해주세요').nullable().optional()`,
      `priority`: `z.enum(['LOW','MEDIUM','HIGH'], { errorMap: () => ({
      message: '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요' })
      }).optional()`,
      `plannedStartDate`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()
      .optional()`,
      `dueDate`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(val => !val
      || val >= new Date().toISOString().split('T')[0], '종료예정일은 오늘
      이후 날짜를 선택해주세요').nullable().optional()`.
      `UpdateTicketInput` 타입을 `z.infer`로 함께 export한다 (SSOT 패턴,
      기존 `CreateTicketInput`과 동일)

**Checkpoint**: 검증 스키마 준비 완료 — User Story 구현 시작 가능

---

## Phase 3: User Story 1 - 티켓 상세 정보 확인 (Priority: P1) 🎯 MVP

**Goal**: `GET /api/tickets/:id`로 존재하는 티켓의 전체 정보(+isOverdue)를
반환하고, 없는 id는 404, 숫자가 아닌 id는 400을 반환한다 (spec.md FR-001,
FR-002).

**Independent Test**: 티켓을 생성한 뒤 그 id로 상세 조회하여 생성 시 입력한
값과 시스템이 채운 값이 정확히 반환되는지, 없는 id는 404가 오는지 확인한다
(quickstart.md 시나리오 1).

### Tests for User Story 1 ⚠️

- [X] T003 [P] [US1] `__tests__/api/tickets-detail.test.ts`를 새로 만들고
      `describe('GET /api/tickets/:id — 상세 조회 (TC-API-003)')` 블록에
      다음 케이스를 작성한다 (contracts/ticket-detail.md 매핑 기준):
      - "003-1: 존재하는 티켓 조회 → 200, 티켓 전체 데이터(모든 필드) 포함"
      - "003-2: 없는 티켓 조회 → 404, 'TICKET_NOT_FOUND', '티켓을 찾을 수
        없습니다'"
      - "003-3: 잘못된 id 형식('abc') → 400, VALIDATION_ERROR"
      - "003-4: 정상 조회 시 isOverdue 파생 필드 포함"
      `POST /api/tickets`로 먼저 티켓을 생성해 id를 얻은 뒤 조회하는 방식
      (기존 `tickets.test.ts`의 `postTickets` 헬퍼 재사용 — import 경로
      확인). 테스트 실행 시 `[id]/route.ts`가 없어 전부 실패해야 한다
      (TDD Red).

### Implementation for User Story 1

- [X] T004 [US1] `src/server/services/ticketService.ts`에 `getById(id:
      number)` 함수를 추가한다: `tickets` 테이블에서 PK로 단일 레코드를
      조회하고, 없으면 `null`을 반환하며 있으면 `isOverdue()`를 계산해
      `TicketWithMeta`로 반환한다 (research.md Decision 3: null 반환 패턴,
      기존 `isOverdue()` 헬퍼 재사용 — export로 변경 필요할 수 있음)
- [X] T005 [US1] `app/api/tickets/[id]/route.ts`를 신규 생성하고
      `export async function GET(req: Request, { params }: { params:
      Promise<{ id: string }> })`를 추가한다: `params.id`를 `Number()`로
      변환해 정수/양수가 아니면 400 VALIDATION_ERROR('잘못된 티켓
      id입니다') 반환, 유효하면 `getById()` 호출 → 결과가 `null`이면 404
      TICKET_NOT_FOUND('티켓을 찾을 수 없습니다'), 있으면 200으로 반환
      (research.md Decision 1, constitution Principle V)
- [X] T006 [US1] `npm run test -- __tests__/api/tickets-detail.test.ts`로
      T003의 4개 테스트가 통과하는지 확인한다 (TDD Green)

**Checkpoint**: `GET /api/tickets/:id`가 완전히 동작. quickstart.md
시나리오 1을 curl로 수동 검증 가능.

---

## Phase 4: User Story 2 - 티켓 정보 수정 (Priority: P1)

**Goal**: `PATCH /api/tickets/:id`로 제목/설명/우선순위/시작예정일/
종료예정일을 부분 수정하고, status/position/startedAt/completedAt은
변경되지 않도록 막는다 (spec.md FR-003~FR-008).

**Independent Test**: 티켓을 생성한 뒤 제목만 바꿔 PATCH하고, 응답에 새
제목과 나머지 기존 값이 그대로 남아있는지, null을 보낸 필드가 비워지는지
확인한다 (quickstart.md 시나리오 2).

### Tests for User Story 2 ⚠️

- [X] T007 [P] [US2] `tickets-detail.test.ts`에
      `describe('PATCH /api/tickets/:id — 수정 (TC-API-004)')` 블록을
      추가하고 다음 케이스를 작성한다:
      - "004-1: 제목만 수정 → 200, 제목 변경, 나머지 필드 유지"
      - "004-2: 우선순위만 변경 → 200, priority만 변경"
      - "004-3: description=null → 200, description이 null이 됨"
      - "004-4: dueDate=null → 200, dueDate가 null이 됨"
      - "004-5: plannedStartDate 수정 → 200, 값 반영"
      - "004-6: plannedStartDate=null → 200, null이 됨"
      - "004-7: 없는 티켓 수정 → 404, TICKET_NOT_FOUND"
      - "004-8: 아무 필드나 수정 후 updatedAt이 이전 값과 달라짐"
      - "004-9: status를 DONE으로 보내도 응답의 status는 변경되지 않음
        (BACKLOG 유지)"
      - (research.md Decision 2 검증용) "필드 미전달 시 기존 값 유지 —
        title 없이 priority만 보내면 title 그대로"
      테스트 실행 시 `route.ts`에 PATCH가 없어 전부 실패해야 한다 (Red).

### Implementation for User Story 2

- [X] T008 [US2] `ticketService.ts`에 `update(id: number, input:
      UpdateTicketInput)` 함수를 추가한다: 먼저 `getById(id)`로 존재
      확인 후 없으면 `null` 반환. 존재하면 `input`에서 `undefined`가 아닌
      필드만 골라 Drizzle `.update(tickets).set({...}).where(eq(tickets.id,
      id))`로 갱신한다 — `description`/`plannedStartDate`/`dueDate`는
      `null`이 명시적으로 전달된 경우와 `undefined`(미전달)를 구분해야
      하므로 `'description' in input` 같은 키 존재 여부 체크로 처리한다
      (data-model.md "검증 규칙", research.md Decision 2).
      `updatedAt`은 스키마의 `$onUpdate`로 자동 갱신되므로 별도 처리
      불필요. `status`/`position`/`startedAt`/`completedAt`은 `set()`
      객체에 절대 포함하지 않는다 (FR-007)
- [X] T009 [US2] `app/api/tickets/[id]/route.ts`에
      `export async function PATCH(req: Request, { params })`를 추가한다:
      id 검증(T005와 동일 패턴) → 요청 바디를 `updateTicketSchema`로
      파싱 → 실패 시 400 VALIDATION_ERROR → 성공 시 `update()` 호출 →
      `null`이면 404, 있으면 200으로 반환
- [X] T010 [US2] `npm run test -- __tests__/api/tickets-detail.test.ts`로
      T007의 10개 케이스가 통과하는지 확인한다 (Green)

**Checkpoint**: `PATCH /api/tickets/:id`가 완전히 동작. US1+US2 함께 정상.

---

## Phase 5: User Story 3 - 불필요한 티켓 삭제 (Priority: P2)

**Goal**: `DELETE /api/tickets/:id`로 티켓을 영구 삭제하고, 삭제 후 조회
시 404가 반환되도록 한다 (spec.md FR-009, FR-010).

**Independent Test**: 티켓을 생성한 뒤 삭제 요청을 보내고, 같은 id로 상세
조회를 시도했을 때 404가 나오는지 확인한다 (quickstart.md 시나리오 3).

### Tests for User Story 3 ⚠️

- [X] T011 [P] [US3] `tickets-detail.test.ts`에
      `describe('DELETE /api/tickets/:id — 삭제 (TC-API-006)')` 블록을
      추가한다:
      - "006-1: 정상 삭제 → 204 본문 없음, 재조회 시 404"
      - "006-2: 없는 티켓 삭제 → 404, TICKET_NOT_FOUND"
      테스트 실행 시 `route.ts`에 DELETE가 없어 전부 실패해야 한다 (Red).

### Implementation for User Story 3

- [X] T012 [US3] `ticketService.ts`에 `remove(id: number)` 함수를
      추가한다: `getById(id)`로 존재 확인 후 없으면 `false` 반환. 존재하면
      `.delete(tickets).where(eq(tickets.id, id))`로 하드 삭제 후 `true`
      반환 (spec.md Assumptions: 하드 삭제, 복구 불가)
- [X] T013 [US3] `app/api/tickets/[id]/route.ts`에
      `export async function DELETE(req: Request, { params })`를
      추가한다: id 검증 → `remove()` 호출 → `false`면 404, `true`면
      `new NextResponse(null, { status: 204 })` 반환 (research.md
      Decision 4: 본문 없는 204)
- [X] T014 [US3] `npm run test -- __tests__/api/tickets-detail.test.ts`로
      T011의 2개 케이스가 통과하는지 확인한다 (Green)

**Checkpoint**: 모든 User Story(US1~US3) 완료 — 세 엔드포인트 모두
spec.md 요구사항을 충족한다.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T015 [P] `npx tsc --noEmit`으로 타입 체크 통과 확인 (constitution
      Principle I)
- [X] T016 [P] `npm run test -- __tests__/api --verbose`로
      `tickets.test.ts`(001) + `tickets-detail.test.ts`(002) 전체가 함께
      통과하는지 확인 (회귀 없음)
- [X] T017 quickstart.md의 3개 수동 검증 시나리오를 `npm run dev` 실행 후
      `curl`로 직접 실행하여 문서와 실제 동작이 일치하는지 확인
- [X] T018 `npm run build`로 프로덕션 빌드 성공 확인 (CLAUDE.md 커밋 전
      체크리스트)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음
- **Foundational (Phase 2)**: Setup 완료 후 — 모든 User Story를 막음
- **US1 (Phase 3)**: Foundational 완료 후, 다른 스토리 의존 없음 — `getById()`를
  최초로 만듦
- **US2 (Phase 4)**: US1의 `getById()`를 내부적으로 재사용하므로 US1 이후
  진행
- **US3 (Phase 5)**: US1의 `getById()`를 내부적으로 재사용하므로 US1 이후
  진행. US2와는 서로 다른 함수(update vs remove)를 다루므로 US1 완료 후
  US2와 병렬 가능
- **Polish (Phase 6)**: 모든 User Story 완료 후

### Parallel Opportunities

- US1 완료 후, US2(수정)와 US3(삭제)는 서로 다른 함수/관심사이므로 병렬
  진행 가능
- T015, T016은 서로 독립적이므로 병렬 실행 가능

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup + Foundational 완료 (T001-T002)
2. User Story 1 완료 (T003-T006) — 이 시점에 상세 조회만으로도 실사용
   가능한 증분
3. 이후 US2(수정), US3(삭제)를 순차 또는 병렬로 추가

### Incremental Delivery

1. Setup + Foundational → 기반 준비
2. US1 추가 → 독립 검증 → 상세 조회 동작 (MVP)
3. US2 추가 → 독립 검증 → 부분 수정까지 동작
4. US3 추가 → 독립 검증 → 삭제까지 동작 (spec.md 전체 충족)
5. Polish → 타입 체크, 전체 회귀 테스트, 빌드 확인

---

## Notes

- 이 기능은 새 DB 마이그레이션이나 신규 npm 의존성을 추가하지 않는다
- `app/api/tickets/[id]/route.ts`는 US1~US3 모두 같은 파일을 공유하므로,
  각 단계에서 해당 HTTP 메서드 함수만 추가하고 기존 함수는 건드리지 않는다
- 테스트는 구현 전에 실패를 먼저 확인한다 (Red-Green)
