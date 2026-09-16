---

description: "Task list for PATCH /api/tickets/:id/complete (티켓 완료 처리)"
---

# Tasks: 티켓 완료 처리

**Input**: Design documents from `/specs/003-ticket-complete/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ticket-complete.md, quickstart.md

**Tests**: TDD(Red-Green-Refactor) 표준 워크플로우 적용 (constitution.md,
001/002와 동일 패턴).

**Organization**: spec.md의 2개 User Story(완료 처리 P1, 완료 칼럼 맨 위
배치 P2)를 기준으로 구성한다. position 계산 로직 일반화(research.md
Decision 1)가 두 스토리 모두에 필요하므로 Foundational 단계에서 먼저
처리한다.

## Path Conventions

- `app/api/tickets/[id]/complete/route.ts` — 신규 Route Handler
- `src/server/services/ticketService.ts` — 기존 파일에 함수 추가/리팩터링
- `__tests__/api/tickets-complete.test.ts` — 신규 테스트 파일

---

## Phase 1: Setup

- [X] T001 `npm run test -- __tests__/api --verbose`로 001/002의 기존
      36개 테스트가 현재 통과 상태인지 확인한다 (회귀 기준선)

**Checkpoint**: 기준선 확인 완료

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `create()`와 `complete()`가 공유할 position 계산 헬퍼를
일반화한다 (research.md Decision 1).

**⚠️ CRITICAL**: 이 단계 완료 전에는 User Story 작업을 시작하지 않는다

- [X] T002 `src/server/services/ticketService.ts`의
      `nextBacklogPosition()`을 `nextTopPosition(status: TicketStatus)`로
      일반화한다: 기존 `where(eq(tickets.status, TICKET_STATUS.BACKLOG))`를
      `where(eq(tickets.status, status))`로 변경. `create()` 호출부를
      `nextTopPosition(TICKET_STATUS.BACKLOG)`로 갱신한다. 동작 변경 없이
      순수 리팩터링이므로 이 시점에 `npm run test --
      __tests__/api/tickets.test.ts`로 기존 20개 테스트가 여전히 통과하는지
      확인한다 (회귀 없음 검증)

**Checkpoint**: position 헬퍼 일반화 완료 — User Story 구현 시작 가능

---

## Phase 3: User Story 1 - 할 일을 완료로 표시 (Priority: P1) 🎯 MVP

**Goal**: `PATCH /api/tickets/:id/complete`로 티켓을 DONE 상태로 전환하고
`completedAt`을 기록한다. 없는 id는 404 (spec.md FR-001, FR-002, FR-004,
FR-005, FR-006).

**Independent Test**: 임의 상태의 티켓을 생성한 뒤 완료 처리를 요청하고,
`status: 'DONE'`과 `completedAt`이 설정되었는지, 없는 id는 404인지
확인한다 (quickstart.md 시나리오 1, 3).

### Tests for User Story 1 ⚠️

- [X] T003 [P] [US1] `__tests__/api/tickets-complete.test.ts`를 새로
      만들고 `describe('PATCH /api/tickets/:id/complete — 완료 처리
      (TC-API-005)')` 블록에 다음 케이스를 작성한다 (contracts/
      ticket-complete.md 매핑 기준):
      - "005-1: 정상 완료 처리 → 200, status=DONE, completedAt 설정"
      - "005-2: completedAt이 현재 시각과 5초 이내로 근접"
      - "005-4: 없는 티켓 완료 처리 → 404, TICKET_NOT_FOUND"
      - "005-5: updatedAt이 완료 처리 전과 달라짐"
      - "(추가) 이미 DONE인 티켓을 다시 완료 처리해도 200, completedAt
        갱신" (research.md Decision 3, Edge Cases)
      `POST /api/tickets`로 티켓을 생성해 id를 얻은 뒤 완료 처리하는
      방식(기존 `tickets-detail.test.ts`의 `postTickets` 헬퍼 패턴 재사용).
      테스트 실행 시 `complete/route.ts`가 없어 전부 실패해야 한다 (Red).

### Implementation for User Story 1

- [X] T004 [US1] `ticketService.ts`에 `complete(id: number)` 함수를
      추가한다: `getById(id)`로 존재 확인 후 없으면 `null` 반환. 존재하면
      `.update(tickets).set({ status: TICKET_STATUS.DONE, completedAt: new
      Date(), position: await nextTopPosition(TICKET_STATUS.DONE)
      }).where(eq(tickets.id, id)).returning()`로 갱신 후
      `TicketWithMeta`로 반환 (data-model.md 상태 전이 표 그대로)
- [X] T005 [US1] `app/api/tickets/[id]/complete/route.ts`를 신규
      생성하고 `export async function PATCH(req: Request, { params })`를
      추가한다: id 검증(002-ticket-detail-crud의 `parseTicketId` 패턴과
      동일 — 별도 유틸로 추출하지 않고 각 route 파일에 복제, 기존
      `[id]/route.ts`와 동일 스타일 유지) → `complete()` 호출 → `null`이면
      404, 있으면 200 (research.md Decision 2: 요청 바디 검증 불필요)
- [X] T006 [US1] `npm run test -- __tests__/api/tickets-complete.test.ts`로
      T003의 5개 케이스가 통과하는지 확인한다 (Green)

**Checkpoint**: `PATCH /api/tickets/:id/complete`가 완전히 동작.
quickstart.md 시나리오 1, 3을 curl로 수동 검증 가능.

---

## Phase 4: User Story 2 - 방금 완료한 일을 보드 맨 위에서 확인 (Priority: P2)

**Goal**: 완료 처리된 티켓이 DONE 칼럼 내에서 기존 완료 티켓들보다 앞쪽에
표시되도록 position을 부여한다 (spec.md FR-003).

**Independent Test**: DONE 칼럼에 이미 티켓이 있는 상태에서 새 티켓을
완료 처리한 뒤 `GET /api/tickets`로 보드를 조회하여, 방금 완료한 티켓이
DONE 배열의 맨 앞에 나타나는지 확인한다 (quickstart.md 시나리오 2).

### Tests for User Story 2 ⚠️

- [X] T007 [P] [US2] `tickets-complete.test.ts`에 다음 케이스를
      추가한다:
      - "005-3: 이미 완료된 티켓이 있는 상태에서 새 티켓을 완료 처리하면,
        GET /api/tickets 조회 시 새로 완료한 티켓이 DONE 배열의 맨 앞에
        나타남"
      T004가 이미 `nextTopPosition(DONE)`을 쓰고 있다면 추가 구현 없이
      통과해야 한다 (T002/T004에서 이미 구현됨 — 이 테스트는 검증 전용).
      테스트 실행 시 통과 여부로 T002/T004 구현을 재확인한다.
      → T003에서 이미 이 케이스를 함께 작성해 T006에서 통과 확인함.

### Implementation for User Story 2

- [X] T008 [US2] T007 테스트가 실패하면 `complete()`의 position 계산이
      `nextTopPosition(TICKET_STATUS.DONE)`을 정확히 쓰고 있는지 재확인
      하고 수정한다. T004에서 이미 정확히 구현했다면 이 태스크는
      **스킵**하고 그 사실을 기록한다.
      → **스킵**: T004에서 `nextTopPosition(TICKET_STATUS.DONE)`을
      정확히 사용했고 005-3 테스트가 추가 구현 없이 통과함.
- [X] T009 [US2] `npm run test -- __tests__/api/tickets-complete.test.ts`로
      T007이 통과하는지 확인한다 (Green)
      → T006에서 이미 확인 완료 (6개 전부 통과).

**Checkpoint**: 모든 User Story(US1~US2) 완료.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T010 [P] `npx tsc --noEmit`으로 타입 체크 통과 확인
- [X] T011 [P] `npm run test -- __tests__/api --verbose`로
      001/002/003 전체 테스트가 함께 통과하는지 확인 (회귀 없음)
- [X] T012 quickstart.md의 3개 수동 검증 시나리오를 `npm run dev` 실행 후
      `curl`로 직접 실행하여 문서와 실제 동작이 일치하는지 확인
- [X] T013 `npm run build`로 프로덕션 빌드 성공 확인

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2, position 헬퍼 일반화)**
  → **US1 (Phase 3, MVP)** → **US2 (Phase 4, position 검증)** → **Polish
  (Phase 5)**
- US2는 US1이 만든 `complete()`를 검증하는 성격이 강해 사실상 순차
  진행이 자연스럽다 (병렬 이득이 크지 않음)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup + Foundational 완료 (T001-T002)
2. User Story 1 완료 (T003-T006) — 완료 처리 자체가 동작하는 증분
3. User Story 2로 position 배치 정확성 검증 (T007-T009)

---

## Notes

- 이 기능은 새 DB 마이그레이션이나 신규 npm 의존성을 추가하지 않는다
- T002(Foundational)의 리팩터링은 기존 `create()` 동작을 바꾸지 않아야
  하므로, 반드시 001의 기존 테스트로 회귀 확인 후 다음 단계로 진행한다
