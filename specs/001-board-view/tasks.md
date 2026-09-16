---

description: "Task list for GET /api/tickets (칸반 보드 조회)"
---

# Tasks: 칸반 보드 조회 (GET /api/tickets)

**Input**: Design documents from `/specs/001-board-view/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/get-tickets.md, quickstart.md

**Tests**: 이 프로젝트는 TDD(Red-Green-Refactor)를 표준 워크플로우로 사용한다
(constitution.md "Development Workflow & Quality Gates", CLAUDE.md, 기존
`POST /api/tickets` 구현이 `test/tc-api-001-red` → `feat/tc-api-001-green`
순서로 진행됨). 따라서 각 User Story마다 테스트 태스크를 먼저 포함한다.

**Organization**: 이 기능은 단일 엔드포인트(`GET /api/tickets`)이며, spec.md의
3개 User Story가 모두 같은 응답을 점진적으로 완성해가는 구조다 (US1: 기본
그룹화 → US2: 정렬 보장 → US3: 파생 필드). 각 스토리는 이전 스토리가 만든
같은 함수(`getBoard()`)를 확장하지만, 완료 시점마다 `curl`로 독립적으로
검증 가능하다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 이 태스크가 속한 User Story (US1, US2, US3)
- 모든 태스크에 정확한 파일 경로 포함

## Path Conventions

이 프로젝트는 Web application 구조를 사용한다 (plan.md "Structure Decision"):
- `app/api/tickets/route.ts` — Route Handler
- `src/server/services/ticketService.ts` — Service 레이어
- `src/shared/types/index.ts` — 공유 타입 (이미 정의됨, 변경 없음)
- `__tests__/api/tickets.test.ts` — 통합 테스트

---

## Phase 1: Setup

**Purpose**: 이 기능은 새 프로젝트 초기화나 신규 의존성이 필요 없다 (plan.md
Technical Context: "신규 의존성 없음"). 기존 스캐폴딩을 그대로 사용한다.

- [X] T001 `npm run test -- __tests__/api/tickets.test.ts`로 기존 POST
      테스트가 현재 통과 상태인지 확인하여 이 기능의 시작점을 확정한다
      (회귀 기준선 확보, 파일 변경 없음)

**Checkpoint**: 기준선 확인 완료 — Foundational 단계로 진행

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 User Story가 공유하는 응답 타입은 이미 `src/shared/types`에
정의되어 있다 (data-model.md 참조: `TicketWithMeta`, `BoardData`,
`COLUMN_ORDER`). 이 단계는 그 존재를 검증만 하며 새로 만들지 않는다.

**⚠️ CRITICAL**: 이 단계 완료 전에는 어떤 User Story 작업도 시작하지 않는다

- [X] T002 `src/shared/types/index.ts`에 `TicketWithMeta`, `BoardData`,
      `COLUMN_ORDER`, `COLUMN_LABELS`가 data-model.md에 정의된 형태 그대로
      존재하는지 확인한다. 없으면 docs/DATA_MODEL.md §4를 기준으로 추가한다
      (이미 존재할 가능성이 높으므로 확인 후 필요 시에만 수정)

**Checkpoint**: 공유 타입 확인 완료 — User Story 구현 시작 가능

---

## Phase 3: User Story 1 - 보드 전체 현황 한눈에 보기 (Priority: P1) 🎯 MVP

**Goal**: 모든 티켓을 상태(BACKLOG/TODO/IN_PROGRESS/DONE)별로 그룹화하여
`{ board, total }` 형태로 반환한다. 빈 칼럼도 오류 없이 빈 배열로 응답한다.
(spec.md FR-001, FR-005, FR-006)

**Independent Test**: 서로 다른 상태의 티켓을 준비한 뒤 `GET /api/tickets`를
호출하여, 각 티켓이 올바른 칼럼에 나타나고 4개 칼럼 키가 항상 존재하는지
확인한다 (quickstart.md 시나리오 1, 2).

### Tests for User Story 1 ⚠️

> 아래 테스트를 먼저 작성하고, 구현 전에 실패하는지 확인한다 (Red).

- [X] T003 [P] [US1] `__tests__/api/tickets.test.ts`에
      `describe('GET /api/tickets — 보드 조회 (TC-API-002)')` 블록을 추가하고,
      다음 케이스를 작성한다 (contracts/get-tickets.md 매핑 기준):
      - "002-1: 빈 DB → 200, board의 4개 키(BACKLOG/TODO/IN_PROGRESS/DONE) 모두
        빈 배열, total: 0" (FR-005)
      - "002-2: 서로 다른 상태의 티켓들이 각자의 칼럼에 정확히 그룹화됨" (FR-001)
      - "002-6: 응답의 total이 실제 포함된 티켓 개수와 일치" (FR-006)
      테스트 실행 시 `route.ts`에 GET이 없어 전부 실패해야 한다 (TDD Red).

### Implementation for User Story 1

- [X] T004 [US1] `src/server/services/ticketService.ts`에 `getBoard()` 함수를
      named export로 추가한다: 전체 `tickets`를 `status, position` 오름차순으로
      조회한 뒤, `COLUMN_ORDER`(BACKLOG, TODO, IN_PROGRESS, DONE) 4개 키를
      가진 객체로 그룹화하여 반환한다. 이 시점에는 `isOverdue`/24시간 필터
      없이 원본 `Ticket` 목록만 그룹화한다 (US3에서 파생 필드 추가 예정이므로
      임시로 `TicketWithMeta`가 아닌 `Ticket[]`을 반환해도 무방 — US3 태스크에서
      타입을 맞춘다). 반환 형태: `{ board: BoardData, total: number }`
      (research.md Decision 3: 단일 쿼리 + 애플리케이션 그룹화)
- [X] T005 [US1] `app/api/tickets/route.ts`에 `export async function GET()`을
      추가한다. 요청 파싱/검증 없이(이 엔드포인트는 입력이 없음 — research.md
      Decision 1) `getBoard()`를 호출하고 결과를 `NextResponse.json(result,
      { status: 200 })`로 반환한다 (constitution Principle V: Route Handler는
      호출과 응답만)
- [X] T006 [US1] `npm run test -- __tests__/api/tickets.test.ts`로 T003의
      테스트가 통과하는지 확인한다 (TDD Green)

**Checkpoint**: `GET /api/tickets`가 상태별 그룹화된 보드를 반환한다.
`quickstart.md` 시나리오 1, 2를 `curl`로 수동 검증 가능.

---

## Phase 4: User Story 2 - 칼럼 내 우선순위/작업 순서 확인 (Priority: P2)

**Goal**: 각 칼럼 내 티켓이 `position` 오름차순으로 정렬되어 반환됨을
보장한다 (spec.md FR-002).

**Independent Test**: 한 칼럼에 순서가 다른 티켓 3개를 배치한 뒤 보드를
반복 조회하여 항상 동일한 순서로 반환되는지 확인한다 (quickstart.md 시나리오
2).

### Tests for User Story 2 ⚠️

- [X] T007 [P] [US2] `__tests__/api/tickets.test.ts`의 TC-API-002 블록에
      케이스를 추가한다:
      - "002-3: 같은 칼럼에 position이 다른 티켓 3개 생성 → 응답 배열이 position
        오름차순으로 정렬됨" (FR-002)
      T004의 쿼리가 이미 `ORDER BY status, position`을 사용한다면 이 테스트는
      추가 구현 없이도 통과할 수 있다 — 통과 여부로 T004 구현을 검증한다.

### Implementation for User Story 2

- [X] T008 [US2] T007 테스트가 실패하면 `ticketService.ts`의 `getBoard()`
      쿼리가 `idx_tickets_status_position` 인덱스를 타도록
      `.orderBy(tickets.status, tickets.position)`를 명시적으로 적용한다
      (data-model.md "구성 규칙": "각 배열은 해당 상태의 TicketWithMeta를
      position 오름차순으로 정렬"). 이미 정렬되어 있다면 이 태스크는 스킵
      가능(주석으로 확인 완료 표시).
      → **스킵**: T004에서 `.orderBy(asc(tickets.status), asc(tickets.position))`를
      이미 적용했고 T007 테스트가 추가 구현 없이 통과함을 확인.
- [X] T009 [US2] `npm run test -- __tests__/api/tickets.test.ts`로 T007이
      통과하는지 확인한다

**Checkpoint**: 칼럼 내 순서가 보장된다. US1+US2가 함께 정상 동작.

---

## Phase 5: User Story 3 - 기한 초과 항목과 최근 완료 항목 식별 (Priority: P3)

**Goal**: 각 티켓에 `isOverdue` 파생 필드를 추가하고, DONE 칼럼은 완료된 지
24시간 이내인 티켓만 노출한다 (spec.md FR-003, FR-004).

**Independent Test**: 기한이 지난 미완료 티켓과, 완료된 지 24시간 이내/이후인
티켓을 각각 준비하여 `isOverdue` 값과 DONE 칼럼 노출 여부가 규칙대로
나타나는지 확인한다 (quickstart.md 시나리오 3, 4).

### Tests for User Story 3 ⚠️

- [X] T010 [P] [US3] `__tests__/api/tickets.test.ts`의 TC-API-002 블록에
      케이스를 추가한다:
      - "002-4: dueDate가 오늘 이전이고 status가 DONE이 아닌 티켓 →
        isOverdue: true" (data-model.md "계산 규칙", spec.md User Story 3
        Acceptance #1)
      - "002-5: dueDate가 오늘 이전이지만 status가 DONE인 티켓 →
        isOverdue: false" (spec.md User Story 3 Acceptance #2)
      - "002-7: dueDate가 없는 티켓 → isOverdue: false" (spec.md Edge Cases)
      - "002-8: completedAt이 24시간 이내인 DONE 티켓 → DONE 배열에 포함"
        (spec.md User Story 3 Acceptance #4)
      - "002-9: completedAt이 24시간 초과인 DONE 티켓 → DONE 배열에서 제외,
        total에도 미포함" (spec.md User Story 3 Acceptance #3, FR-004)
      테스트 데이터 준비 시 과거 completedAt은 DB에 직접 삽입하거나 테스트
      헬퍼로 timestamp를 조작한다 (API로는 과거 시각을 생성할 수 없음).

### Implementation for User Story 3

- [X] T011 [US3] `ticketService.ts`에 `isOverdue(ticket)` 헬퍼 함수를 추가한다
      (또는 `src/shared/`에 두어 재사용 가능하게 함): `dueDate`가 없으면
      `false`, `status === 'DONE'`이면 `false`, 그 외 `dueDate < 오늘 날짜
      (YYYY-MM-DD)`면 `true` (docs/DATA_MODEL.md §5.3, data-model.md "계산
      규칙" 그대로)
- [X] T012 [US3] `ticketService.ts`에 `isDoneVisible(ticket)` 헬퍼 함수를
      추가한다: `status !== 'DONE'`이면 `false`, `completedAt`이 없으면
      `false`, 그 외 `Date.now() - completedAt.getTime() <= 24 * 60 * 60 *
      1000`이면 `true` (docs/DATA_MODEL.md §5.4, data-model.md "Done 가시성"
      그대로)
- [X] T013 [US3] `getBoard()`를 수정하여, 그룹화 시 각 티켓에 `isOverdue`
      (T011)를 계산해 붙여 `TicketWithMeta`로 변환하고, `DONE` 배열은
      `isDoneVisible()`(T012)이 `true`인 티켓만 포함하도록 필터링한다.
      `total`은 이 필터링 이후 최종 포함된 티켓 수로 계산한다 (FR-004, FR-006)
- [X] T014 [US3] `npm run test -- __tests__/api/tickets.test.ts`로 T010의
      5개 케이스가 모두 통과하는지 확인한다

**Checkpoint**: 모든 User Story(US1~US3) 완료 — `GET /api/tickets`가
spec.md의 전체 요구사항을 충족한다.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 전체 기능에 대한 최종 검증

- [X] T015 [P] `npx tsc --noEmit`으로 타입 체크 통과 확인 (constitution
      Principle I)
- [X] T016 [P] `npm run test -- __tests__/api/tickets.test.ts --verbose`로
      TC-API-001(POST, 기존)과 TC-API-002(GET, 신규) 전체가 함께 통과하는지
      최종 확인 (회귀 없음 확인)
- [X] T017 quickstart.md의 4개 수동 검증 시나리오를 `npm run dev` 실행 후
      `curl`로 직접 실행하여 문서와 실제 동작이 일치하는지 확인
- [X] T018 docs/TEST_CASES.md에 TC-API-002(GET /api/tickets) 케이스가
      누락되어 있다면 이번에 작성한 테스트 케이스 목록으로 추가한다
      (constitution Principle II: API_SPEC.md/TEST_CASES.md와 구현 일치 유지)
      → TC-API-002(002-1~002-8)가 이미 문서화되어 있었음. 테스트 코드의
      케이스 번호가 문서와 어긋나 있어(002-4/5/6 순서 불일치) 문서 기준으로
      재배치. 문서에 없는 엣지 케이스(dueDate 없음)는 "002-7b"로 별도 표기.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음, 즉시 시작 가능
- **Foundational (Phase 2)**: Setup 완료 후 시작 — 모든 User Story를 막음
- **User Story 1 (Phase 3)**: Foundational 완료 후 시작, 다른 스토리 의존 없음
- **User Story 2 (Phase 4)**: Foundational 완료 후 시작 가능하지만, US1의
  `getBoard()` 골격(T004)이 있어야 정렬을 검증할 수 있으므로 실질적으로 US1
  이후 진행
- **User Story 3 (Phase 5)**: 마찬가지로 US1의 `getBoard()`(T004)를 확장하는
  구조이므로 US1 이후 진행 (US2와는 서로 독립적 — 병렬 가능)
- **Polish (Phase 6)**: 모든 User Story 완료 후 진행

### User Story Dependencies

- **US1 (P1)**: 독립적 — MVP
- **US2 (P2)**: US1이 만든 `getBoard()` 함수를 전제로 하지만, 정렬 로직
  자체는 US3(파생 필드)와 무관하여 US3과 병렬 진행 가능
- **US3 (P3)**: US1이 만든 `getBoard()` 함수를 확장. US2와 병렬 진행 가능
  (서로 다른 관심사: 정렬 vs 파생 필드)

### Within Each User Story

- 테스트를 먼저 작성하고 실패를 확인한 뒤(Red) 구현한다(Green)
- Service 함수(ticketService.ts) 구현 후 Route Handler에서 호출
- 각 스토리 완료 후 다음 우선순위로 이동

### Parallel Opportunities

- T003 (US1 테스트 작성)은 다른 태스크와 독립적으로 먼저 작성 가능
- US2(Phase 4)와 US3(Phase 5)는 서로 다른 관심사(정렬 vs 파생 필드)를
  다루므로, US1(Phase 3) 완료 후 두 스토리를 병렬로 진행 가능
- T015, T016은 서로 다른 검증이므로 병렬 실행 가능

---

## Parallel Example: User Story 1

```bash
# T003은 US1의 유일한 선행 테스트 태스크이므로 단독 실행
Task: "TC-API-002 GET 테스트 케이스 작성 in __tests__/api/tickets.test.ts"
```

## Parallel Example: User Story 2 + User Story 3 (US1 완료 후)

```bash
# 서로 다른 관심사이므로 동시 진행 가능
Task: "US2 정렬 검증 테스트 및 구현 (T007-T009)"
Task: "US3 isOverdue/24시간 필터 테스트 및 구현 (T010-T014)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup 완료 (T001)
2. Phase 2: Foundational 완료 (T002)
3. Phase 3: User Story 1 완료 (T003-T006)
4. **중단 후 검증**: `curl`로 상태별 그룹화가 정확한지 확인
5. 이 시점에서 이미 실사용 가능한 최소 기능(칼럼별 조회) 확보

### Incremental Delivery

1. Setup + Foundational → 기반 준비 완료
2. US1 추가 → 독립 검증 → 상태별 그룹화 동작 (MVP)
3. US2 추가 → 독립 검증 → 순서 보장까지 동작
4. US3 추가 → 독립 검증 → 기한 초과/24시간 필터까지 동작 (spec.md 전체 충족)
5. Polish → 타입 체크, 전체 회귀 테스트, 문서 동기화

---

## Notes

- [P] 태스크 = 다른 파일 또는 독립적 작업, 의존성 없음
- [Story] 라벨은 태스크를 특정 User Story에 연결해 추적성을 보장
- 테스트는 구현 전에 실패를 먼저 확인한다 (Red-Green, constitution
  "Development Workflow & Quality Gates")
- 각 태스크 또는 논리적 묶음 완료 후 커밋
- 체크포인트마다 멈춰서 해당 스토리를 독립적으로 검증 가능
- 이 기능은 새 DB 마이그레이션이나 신규 npm 의존성을 추가하지 않는다
  (plan.md Technical Context 참조)
