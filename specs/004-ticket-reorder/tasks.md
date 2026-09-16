---

description: "Task list for PATCH /api/tickets/reorder (티켓 순서/상태 변경)"
---

# Tasks: 티켓 순서/상태 변경 (reorder)

**Input**: Design documents from `/specs/004-ticket-reorder/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ticket-reorder.md, quickstart.md

**Tests**: TDD(Red-Green-Refactor) 표준 워크플로우 적용 (001~003과 동일
패턴).

**Organization**: spec.md의 3개 User Story(칼럼 간 이동 P1, 칼럼 내 순서
재배치 P1, 시작/완료 시각 자동 관리 P2)를 기준으로 구성한다. 세 스토리
모두 동일한 `reorder()` 함수 하나를 확장해가며 구현한다 — position
재계산 알고리즘(US1/US2 공통 기반)을 먼저 만들고, US3에서
startedAt/completedAt 파생 로직을 추가한다.

## Path Conventions

- `app/api/tickets/reorder/route.ts` — 신규 Route Handler
- `src/server/services/ticketService.ts` — 기존 파일에 함수 추가
- `src/shared/validations/ticket.ts` — 기존 파일에 `reorderTicketSchema` 추가
- `__tests__/api/tickets-reorder.test.ts` — 신규 테스트 파일

---

## Phase 1: Setup

- [X] T001 `npm run test -- __tests__/api --verbose`로 001/002/003의
      기존 42개 테스트가 현재 통과 상태인지 확인한다 (회귀 기준선)

**Checkpoint**: 기준선 확인 완료

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 요청 검증 스키마를 먼저 정의한다.

**⚠️ CRITICAL**: 이 단계 완료 전에는 User Story 작업을 시작하지 않는다

- [X] T002 `src/shared/validations/ticket.ts`에 `reorderTicketSchema`를
      추가한다 (data-model.md "ReorderTicketInput" 표, API_SPEC.md §457
      reorderTicketSchema 기준): `ticketId: z.number().int().positive()`,
      `status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS'], { errorMap: ()
      => ({ message: '상태는 BACKLOG, TODO, IN_PROGRESS 중
      선택해주세요' }) })`, `position: z.number().int()`.
      `ReorderTicketInput` 타입을 `z.infer`로 함께 export한다. `status`
      열거형에 `DONE`을 포함하지 않으므로 `DONE` 전송 시 자동으로
      VALIDATION_ERROR가 발생한다 (research.md Decision 5)

**Checkpoint**: 검증 스키마 준비 완료 — User Story 구현 시작 가능

---

## Phase 3: User Story 1 - 티켓을 다른 칼럼으로 이동 (Priority: P1) 🎯 MVP

**Goal**: `PATCH /api/tickets/reorder`로 티켓을 다른 칼럼(BACKLOG/TODO/
IN_PROGRESS)으로 이동시키고, position을 배열 인덱스 기반으로 계산해
배치한다. 없는 id는 404, DONE 요청은 400 (spec.md FR-001, FR-002,
FR-010, FR-011).

**Independent Test**: 대기 칼럼의 티켓을 할 일 칼럼의 특정 인덱스로
이동 요청한 뒤 보드를 조회하여 상태와 위치가 반영됐는지, 없는 id/DONE
요청이 각각 404/400인지 확인한다 (quickstart.md 시나리오 1, 4).

### Tests for User Story 1 ⚠️

- [X] T003 [P] [US1] `__tests__/api/tickets-reorder.test.ts`를 새로
      만들고 `describe('PATCH /api/tickets/reorder — 순서/상태 변경
      (TC-API-007)')` 블록에 다음 케이스를 작성한다 (contracts/
      ticket-reorder.md 매핑 기준):
      - "007-1: 칼럼 간 이동(BACKLOG→TODO) → status=TODO, position 갱신"
      - "007-9: status='DONE' 전송 → 400, VALIDATION_ERROR"
      - "007-10: 잘못된 status('INVALID') → 400, '상태는 BACKLOG, TODO,
        IN_PROGRESS 중 선택해주세요'"
      - "007-11: 없는 ticketId → 404, TICKET_NOT_FOUND"
      - "007-12: 정상 이동 후 updatedAt이 이전 값과 달라짐"
      `POST /api/tickets`로 티켓을 생성해 id를 얻은 뒤 reorder 요청하는
      방식(기존 테스트 헬퍼 패턴 재사용). 테스트 실행 시
      `reorder/route.ts`가 없어 전부 실패해야 한다 (Red).

### Implementation for User Story 1

- [X] T004 [US1] `ticketService.ts`에 position 재계산 헬퍼
      `calculateInsertPosition(columnTickets: Ticket[], index: number):
      { position: number; needsRebalance: boolean }`를 추가한다
      (research.md Decision 2): `prev = columnTickets[index - 1] ??
      null`, `next = columnTickets[index] ?? null`. `prev`/`next` 모두
      없으면 `{ position: 0, needsRebalance: false }`. `prev`만 없으면
      `{ position: next.position - 1024, needsRebalance: false }`.
      `next`만 없으면 `{ position: prev.position + 1024,
      needsRebalance: false }`. 둘 다 있으면 `mid = (prev.position +
      next.position) / 2`; `mid - prev.position < 1` 이거나 `next.position
      - mid < 1`이면 `needsRebalance: true`(이때 position 값은 호출부에서
      재정렬 후 재계산하므로 임시값 무시), 아니면
      `{ position: mid, needsRebalance: false }`
- [X] T005 [US1] `ticketService.ts`에 `reorder(input:
      ReorderTicketInput)` 함수를 추가한다: `db.transaction(async (tx) =>
      {...})` 내부에서 (1) `getById(ticketId)`로 대상 티켓 조회, 없으면
      트랜잭션 내에서 `null`을 반환하는 방식으로 처리(또는 트랜잭션 밖에서
      사전 조회 — 구현 시 Drizzle 트랜잭션 콜백의 반환값 처리 방식에 맞춰
      선택), (2) 대상 칼럼(`status`)의 기존 티켓들을 position 오름차순
      조회(이동할 티켓 자신 제외), (3) T004로 새 position 계산,
      `needsRebalance`면 그 칼럼 전체를 0부터 1024 간격으로 재정렬하는
      UPDATE들을 먼저 수행하고 재계산, (4) 대상 티켓을
      status/position으로 UPDATE. 이 시점에는 startedAt/completedAt은
      건드리지 않는다(US3에서 추가). 반환 형태: `{ ticket: TicketWithMeta,
      affected: { id: number; position: number }[] }` — 없으면 `null`
- [X] T006 [US1] `app/api/tickets/reorder/route.ts`를 신규 생성하고
      `export async function PATCH(req: Request)`를 추가한다: 요청 바디를
      `reorderTicketSchema`로 파싱 → 실패 시 400 VALIDATION_ERROR →
      성공 시 `reorder()` 호출 → `null`이면 404, 있으면 200으로 반환
      (constitution Principle V: Route Handler는 파싱/검증 호출과
      응답만)
- [X] T007 [US1] `npm run test -- __tests__/api/tickets-reorder.test.ts`로
      T003의 5개 케이스가 통과하는지 확인한다 (Green)

**Checkpoint**: `PATCH /api/tickets/reorder`가 칼럼 간 이동을 처리한다.
quickstart.md 시나리오 1, 4를 curl로 수동 검증 가능.

---

## Phase 4: User Story 2 - 같은 칼럼 내에서 순서 재배치 (Priority: P1)

**Goal**: 같은 칼럼 내 순서 변경이 정확히 반영되고, 재정렬이 발생하면
`affected` 배열에 영향받은 티켓들이 포함된다 (spec.md FR-007, FR-008,
FR-009).

**Independent Test**: 한 칼럼에 티켓 3개가 있을 때 마지막 티켓을 맨
앞으로 옮기도록 요청한 뒤, 응답과 보드 조회로 순서가 바뀌었는지 확인한다
(quickstart.md 시나리오 3).

### Tests for User Story 2 ⚠️

- [X] T008 [P] [US2] `tickets-reorder.test.ts`에 다음 케이스를
      추가한다:
      - "007-2: 같은 칼럼 내 순서 변경 → status 유지, position만 변경"
      - "007-8: 촘촘한 간격의 칼럼 중간에 삽입 → affected 배열에 영향받은
        티켓 포함" (position 간격이 1 미만이 되도록 유도: 같은 칼럼에
        티켓을 여러 개 연속 삽입해 간격을 좁힌 뒤 그 사이에 삽입 요청)
      - "(추가) 트랜잭션 원자성: 존재하지 않는 ticketId로 요청해도 다른
        티켓들의 position은 변경되지 않음" (FR-009 방어적 검증)
      테스트 실행 시 통과 여부로 T004/T005의 재정렬 로직을 검증한다.

### Implementation for User Story 2

- [X] T009 [US2] T008 테스트가 실패하면 T004/T005의 재정렬 조건
      (`needsRebalance`)과 `affected` 배열 조립 로직을 점검하고 수정한다.
      T005에서 이미 정확히 구현했다면 이 태스크는 **스킵**하고 그 사실을
      기록한다.
      → **스킵**: T005에서 재정렬/affected 조립을 이미 정확히 구현했고,
      T008의 007-2/007-8/추가 케이스가 T003과 함께 작성되어 통과함.
- [X] T010 [US2] `npm run test -- __tests__/api/tickets-reorder.test.ts`로
      T008이 통과하는지 확인한다 (Green)

**Checkpoint**: 칼럼 내 순서 재배치와 재정렬(affected)이 정확히 동작.
US1+US2 함께 정상.

---

## Phase 5: User Story 3 - 이동에 따른 시작/완료 시각 자동 관리 (Priority: P2)

**Goal**: 이동 방향에 따라 startedAt/completedAt이 자동으로 설정/초기화
된다 (spec.md FR-003~FR-006).

**Independent Test**: 대기 상태 티켓을 할 일로 옮겨 startedAt이 기록
되는지, 다시 대기로 되돌렸을 때 비워지는지, 완료 상태였던 티켓을 다른
칼럼으로 옮겼을 때 완료 시각이 비워지는지 확인한다 (quickstart.md
시나리오 1, 2).

### Tests for User Story 3 ⚠️

- [X] T011 [P] [US3] `tickets-reorder.test.ts`에 다음 케이스를
      추가한다:
      - "007-3: BACKLOG→TODO 이동 시 startedAt ≈ 현재 시각"
      - "007-4: TODO→BACKLOG 이동 시 startedAt=null"
      - "007-5: DONE→TODO(완료 처리 API로 먼저 DONE을 만든 뒤 reorder로
        TODO 이동) → completedAt=null, startedAt 설정"
      - "007-6: DONE→BACKLOG → completedAt=null, startedAt=null"
        (research.md Decision 4 확장 규칙 검증 — 핵심 케이스)
      - "007-7: TODO→IN_PROGRESS 이동 시 startedAt 변경 없음"
      DONE 상태를 만들 때는 003-ticket-complete의
      `PATCH /api/tickets/:id/complete`를 재사용한다 (기존 엔드포인트
      조합으로 픽스처 구성). 테스트 실행 시 `reorder()`가 아직
      startedAt/completedAt을 다루지 않아 전부 실패해야 한다 (Red).

### Implementation for User Story 3

- [X] T012 [US3] `ticketService.ts`의 `reorder()`를 수정하여, 대상
      티켓 UPDATE에 다음 파생 필드 로직을 추가한다 (research.md
      Decision 4, data-model.md 상태 전이 표): 이동 전 조회한 티켓의
      기존 `status`를 `from`, 요청의 `status`를 `to`라 할 때 —
      `to === 'TODO' && from !== 'TODO'`면 `startedAt: new Date()`;
      `to === 'BACKLOG'`면 `startedAt: null`; 그 외에는 UPDATE 객체에
      `startedAt` 필드 자체를 포함하지 않음(기존 값 유지). 별도로
      `from === 'DONE'`이면 `completedAt: null`을 UPDATE 객체에 포함
- [X] T013 [US3] `npm run test -- __tests__/api/tickets-reorder.test.ts`로
      T011의 5개 케이스가 통과하는지 확인한다 (Green)

**Checkpoint**: 모든 User Story(US1~US3) 완료 — `PATCH
/api/tickets/reorder`가 spec.md 전체 요구사항을 충족한다.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T014 [P] `npx tsc --noEmit`으로 타입 체크 통과 확인
- [X] T015 [P] `npm run test -- __tests__/api --verbose`로
      001~004 전체 테스트가 함께 통과하는지 확인 (회귀 없음)
- [X] T016 quickstart.md의 4개 수동 검증 시나리오를 `npm run dev` 실행 후
      `curl`로 직접 실행하여 문서와 실제 동작이 일치하는지 확인
- [X] T017 `npm run build`로 프로덕션 빌드 성공 확인
      → 초기 빌드에서 ESLint 오류(`prefer-const`) 발견, `let` → `const`로
      수정하고 사용되지 않는 eslint-disable 주석도 제거해 경고 없이
      클린 빌드 완료.
- [X] T018 docs/TEST_CASES.md TC-API-007의 12개 케이스(007-1~007-12)가
      모두 테스트 코드에 반영되었는지 최종 대조
      → grep으로 확인 완료: 007-1부터 007-12까지 전부 존재.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **US1 (Phase 3,
  MVP: 칼럼 간 이동 + position 계산 기반)** → **US2 (Phase 4: 재정렬/
  affected 검증)** → **US3 (Phase 5: startedAt/completedAt 파생)** →
  **Polish (Phase 6)**
- US2는 US1의 position 계산 로직(T004/T005)을 검증하는 성격이 강해
  순차 진행이 자연스럽다
- US3는 US1/US2와 독립적인 관심사(파생 필드)이므로, US1 완료 후 US2와
  병렬 진행도 가능하다 — 단 두 스토리 모두 같은 `reorder()` 함수를
  수정하므로 실제로는 순차 진행 권장

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup + Foundational 완료 (T001-T002)
2. User Story 1 완료 (T003-T007) — 칼럼 간 이동 자체가 동작하는 증분
3. User Story 2로 재정렬 정확성 검증 (T008-T010)
4. User Story 3로 시작/완료 시각 자동 관리 추가 (T011-T013)

---

## Notes

- 이 기능은 새 DB 마이그레이션이나 신규 npm 의존성을 추가하지 않는다
- 요청 `position` 필드는 배열 인덱스로 해석한다 — API_SPEC.md에 명시적
  정의가 없어 research.md Decision 1에서 사용자 확인을 거쳐 확정했다
- startedAt 초기화 규칙은 `to === 'BACKLOG'`면 출발 칼럼과 무관하게
  항상 적용한다 — docs/DATA_MODEL.md §5.1(TODO→BACKLOG만)과
  docs/TEST_CASES.md 007-6(DONE→BACKLOG도 포함)이 상충하여
  research.md Decision 4에서 사용자 확인을 거쳐 후자로 확정했다
- 트랜잭션(FR-009) 원자성은 T008의 방어적 테스트로 최소 검증하되, 완전한
  동시성 테스트(레이스 컨디션)는 이 기능의 범위 밖이다
