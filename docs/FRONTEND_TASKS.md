# Tika - 프론트엔드 구현 계획 (FRONTEND_TASKS.md)

> `docs/COMPONENT_SPEC.md` 기반 bottom-up 구현 계획.
> 백엔드 7개 API는 이미 구현/테스트 완료 상태 (`docs/API_SPEC.md`,
> TC-API-001~007). 이 문서는 그 위에 붙는 프론트엔드만 다룬다.
> 관련: `docs/REQUIREMENTS.md`, `app/globals.css`(디자인 토큰, 이미 정의됨)

---

## 0. 원칙

- **Bottom-up**: 의존성이 없는 말단 컴포넌트(Badge, Button)부터 시작해,
  그것들을 조합하는 컴포넌트를 순서대로 올라간다. 상위 컴포넌트는 하위가
  끝나야 실제로 조립/렌더할 수 있으므로, 이 순서가 곧 "이전 단계 없이는
  다음 단계를 시작할 수 없는" 강제 순서이기도 하다.
- **TDD**: `CLAUDE.md`의 Red-Green-Refactor를 컴포넌트에도 동일하게
  적용한다 — 테스트를 먼저 작성해 실패를 확인한 뒤 구현한다. 단, 순수
  스타일/레이아웃만 다루는 항목은 시각적 확인으로 대체 가능(아래 각
  Phase의 "테스트 성격" 참고).
  프로젝트의 `/speckit-*` 워크플로우(spec→plan→tasks→implement)를 이미
  거친 백엔드와 달리, 이 문서 자체가 각 컴포넌트의 tasks.md 역할을
  겸한다 — Phase 단위로 새 브랜치를 만들어 진행하는 것을 권장한다
  (`CLAUDE.md` 브랜치 전략 참고).
- **파일 위치**: `src/client/components/{ui,ticket,board}`,
  `src/client/hooks/`, `src/client/api/`. 테스트는
  `__tests__/components/`, `__tests__/hooks/`.
- **Props/타입**: 모두 `docs/COMPONENT_SPEC.md`에 정의된 그대로 따른다
  — 이 문서에서 임의로 확장하지 않는다.
- **시각 확인**: 각 Phase 완료 시 `app/preview/page.tsx`의 해당 섹션에
  실제 컴포넌트를 목 데이터로 연결해 `npm run dev` → `/preview`에서
  육안으로 확인한다.

---

## 1. Phase 개요

| Phase | 이름 | 포함 컴포넌트 | 상태 |
|---|---|---|---|
| 1 | 기본 UI 컴포넌트 | PriorityBadge, DueDateBadge, Button, Modal, ConfirmDialog | ✅ 완료 |
| 2 | Board 컴포넌트 | TicketCard, ColumnHeader, Column, Board | ✅ 완료 |
| 3 | 입력폼과 모달 | TicketForm, TicketModal | ✅ 완료 |
| 4 | 데이터 레이어 | ticketApi, useTickets | ✅ 완료 |
| 5 | 헤더 / 필터 | BoardHeader, FilterBar | ✅ 완료 |
| 6 | 컨테이너 | BoardContainer, `app/(board)/page.tsx` | ✅ 완료 |

---

## 2. 의존성 그래프

```
Phase 1 — 기본 UI 컴포넌트 (의존성 없음, globals.css 토큰만 필요)
├── PriorityBadge
├── DueDateBadge
├── Button
├── Modal
└── ConfirmDialog          → Button, Modal

Phase 2 — Board 컴포넌트 (Phase 1에 의존)
├── TicketCard              → PriorityBadge, DueDateBadge, @dnd-kit/sortable
├── ColumnHeader             (독립적 소형 컴포넌트)
├── Column                  → TicketCard, ColumnHeader, @dnd-kit/sortable, @dnd-kit/core
└── Board                   → Column, @dnd-kit/core (DndContext, DragOverlay)

Phase 3 — 입력폼과 모달 (Phase 1, 2에 의존)
├── TicketForm              → Button, src/shared/validations/ticket.ts (Zod)
└── TicketModal              → Modal, TicketForm, ConfirmDialog, Button
                              (+ TicketDetailView: TicketModal 내부 서브파트)

Phase 4 — 데이터 레이어 (Phase 1~3과 독립적, 언제든 병행 가능)
├── ticketApi                → src/shared/types, fetch
└── useTickets                → ticketApi

Phase 5 — 헤더 / 필터 (Phase 1에만 의존, Phase 2~4와 병행 가능)
├── BoardHeader              → Button
└── FilterBar                 (독립적, Phase 1 스타일만 사용)

Phase 6 — 컨테이너 (Phase 2~5 전부 필요)
├── BoardContainer            → Board, BoardHeader, FilterBar, TicketModal, useTickets
└── app/(board)/page.tsx      → BoardContainer (서버 컴포넌트, 초기 데이터 fetch)
```

**병렬 진행 가능 지점**: Phase 4(useTickets/ticketApi)는 Phase 1~3의 UI
트리와 데이터/타입 계약(`TicketWithMeta`, `BoardData`)만 공유하고 실제
렌더 의존성은 없으므로, UI를 만드는 동안 별도로 병행 개발해도 무방하다.
Phase 5(헤더/필터)도 Phase 1만 있으면 시작 가능해 Phase 2~4와 병행할 수
있다. Phase 6(컨테이너)만 나머지 전부를 필요로 하는 합류 지점이다.

**최소 크리티컬 패스**: 1 → 2 → 3 → 6 (Phase 4, 5는 이 경로와 병행
가능하지만 늦어도 Phase 6 시작 전에는 완료되어야 한다).

---

## 3. Phase별 컴포넌트 상세 + TDD 체크리스트

각 컴포넌트 항목은 COMPONENT_SPEC.md의 원문 스펙을 그대로 인용하며,
테스트는 React Testing Library + `@testing-library/user-event` 기준으로
작성한다 (`__tests__/components/<name>.test.tsx`). `@dnd-kit/core`,
`@dnd-kit/sortable`, `@dnd-kit/utilities`를 사용하는 컴포넌트는
`jest.mock`으로 대체해 DndContext 없이도 단독 렌더 테스트가 가능하게
한다 — 실제 드래그 동작 자체는 Phase 6 이후 수동 브라우저 검증으로
커버한다 (아래 각 Phase 완료 기준 참고).

### Phase 1 — 기본 UI 컴포넌트 ✅

#### 1.1 PriorityBadge / DueDateBadge

**파일**: `src/client/components/ui/PriorityBadge.tsx`,
`src/client/components/ui/DueDateBadge.tsx`
**스펙**: 우선순위 표시 LOW(회색)/MEDIUM(파란색)/HIGH(빨간색), 종료예정일
(YYYY-MM-DD) + 오버듀 강조. `app/globals.css`의
`--color-priority-{low,medium,high}-{bg,text}`, `--color-overdue` 토큰을
사용한다. `PriorityBadge`는 `data-priority` 속성을 노출한다(TicketCard
C001-7에서 상태 속성 기반 검증에 사용).

**완료**: 4 + 5 tests. `docs/TEST_CASES.md`에 이 두 컴포넌트를 위한 전용
TC는 없으며(TicketCard TC-COMP-001의 일부로 다뤄짐), 독립 컴포넌트로
분리한 만큼 자체 테스트도 별도로 둔다.

#### 1.2 Button

**파일**: `src/client/components/ui/Button.tsx`
**스펙**: variant(primary/secondary/danger/ghost), size(sm/md/lg), 로딩
상태 지원.

**완료**: 16 tests. secondary variant는 board 배경과 동색이라 테두리
(`border-neutral-border`)로 구분하도록 수정됨; size 스케일은 패딩
중심으로 절제된 단계감을 갖도록 조정됨 (커밋 이력 참고).

#### 1.3 Modal / ConfirmDialog

**파일**: `src/client/components/ui/Modal.tsx`,
`src/client/components/ui/ConfirmDialog.tsx`
**스펙**: Modal — 오버레이 + 중앙 정렬, ESC/바깥 클릭 닫기, body 스크롤
잠금, `role="dialog"`. ConfirmDialog — Modal + Button(danger variant)
조합.

**완료**: 7 + 5 tests.

**Phase 1 완료 기준**: ✅ 전 항목 통과. `npm run test --
__tests__/components/PriorityBadge __tests__/components/DueDateBadge
__tests__/components/Button __tests__/components/Modal
__tests__/components/ConfirmDialog`, `npx tsc --noEmit` 통과.

---

### Phase 2 — Board 컴포넌트 ✅

#### 2.1 TicketCard

**파일**: `src/client/components/ticket/TicketCard.tsx`
**스펙**: `docs/TEST_CASES.md` TC-COMP-001. 제목(1줄 말줄임), 우선순위
뱃지, 종료예정일, 오버듀 표시(`data-overdue` 속성), 완료 상태
(`ticket-card--done` 클래스), 클릭 시 `onClick`, `role="button"`,
`aria-label="티켓: {title}"`, 키보드 Enter/Space.

**완료**: 13 tests (TC-COMP-001 C001-1~7 전체 커버). `useSortable`을
연결하되 테스트에서는 `@dnd-kit/sortable`/`@dnd-kit/utilities`를 mock.
`.ticket-card`, `.ticket-card--done`, `.ticket-card--dragging`,
`[data-overdue='true']`를 `app/globals.css`의 `@layer components`에
추가 (컴포넌트 클래스는 `.tsx`에서 Tailwind 유틸리티로 구현한다는 기본
원칙의 의도적 예외 — 상태 조합이 반복되는 경우로 한정).

#### 2.2 ColumnHeader

**파일**: `src/client/components/board/ColumnHeader.tsx`
**스펙**: 칼럼명(`label`) + 티켓 수(`count`) 뱃지 표시. Column 스펙의
헤더 요구사항을 분리한 소형 컴포넌트.

**완료**: 4 tests.

#### 2.3 Column

**파일**: `src/client/components/board/Column.tsx`
**스펙**: `docs/TEST_CASES.md` TC-COMP-002. `SortableContext` +
`useDroppable`, 빈 상태 안내("이 칼럼에 티켓이 없습니다"), BACKLOG는
사이드바 스타일(`column--sidebar`, `app/globals.css` `@layer
components`에 정의: 고정 폭 280px + 자체 스크롤), DONE은 서버가 이미
24시간 필터링해서 내려주므로 그대로 렌더.

**완료**: 8 tests (TC-COMP-002 C002-1~3 + 추가 케이스).

#### 2.4 Board

**파일**: `src/client/components/board/Board.tsx`
**스펙**: `docs/TEST_CASES.md` TC-COMP-003. `DndContext`+`DragOverlay`로
전체 감싸기, Backlog 사이드바 + TODO/IN_PROGRESS/DONE 3칼럼 그리드,
반응형(Tailwind `md:`/`lg:` 브레이크포인트 — NFR-002).

**완료**: 4 tests (TC-COMP-003 C003-1~2 + 클릭 전파/데이터 분리 확인).
실제 드래그 이벤트 핸들링(`onDragStart`/`onDragEnd`)은 Phase 6
BoardContainer가 담당 — Board 자신은 레이아웃과 클릭 전파만 검증됨.

**Phase 2 완료 기준**: ✅ 전 항목 통과. `npm run test --
__tests__/components/TicketCard __tests__/components/ColumnHeader
__tests__/components/Column __tests__/components/Board`, `npx tsc
--noEmit` 통과. `/preview` Phase 2 섹션에서 4칼럼 레이아웃과 다양한
티켓 상태(HIGH 우선순위, 오버듀, 완료, 긴 제목)를 육안 확인 완료.

---

### Phase 3 — 입력폼과 모달 ✅

#### 3.1 TicketForm

**파일**: `src/client/components/ticket/TicketForm.tsx`
**스펙**: mode(create/edit), 필드 5개(title/description/priority/
plannedStartDate/dueDate), 클라이언트 Zod 검증(`src/shared/validations/ticket.ts`
공유), Enter/제출 버튼 제출, 제출 중 버튼 비활성화+로딩, 성공 시 초기화
(create) 또는 모달 닫기(edit).

**TDD 체크리스트**:
- [x] Red: 5개 필드가 모두 렌더되는지(label 또는 placeholder 텍스트 기준
      `getByLabelText` 등) 테스트
- [x] Red: `mode="edit"` + `initialData`로 필드에 기존 값이 채워지는 테스트
- [x] Red: title 빈 값으로 제출 시 "제목을 입력해주세요" 에러가 인라인
      노출되고 `onSubmit`이 호출되지 않는 테스트
- [x] Red: dueDate에 과거 날짜 입력 시 "종료예정일은 오늘 이후 날짜를
      선택해주세요" 에러 테스트
- [x] Red: 유효한 값 입력 후 제출 버튼 클릭 시 `onSubmit`이 올바른
      데이터로 호출되는 테스트
- [x] Red: 유효한 값 입력 후 Enter 키로도 제출되는 테스트
- [x] Red: `isLoading=true`일 때 제출 버튼이 disabled인지 테스트
- [x] Red: `onCancel`이 취소 버튼 클릭 시 호출되는 테스트
- [x] Green: `react-hook-form` 없이 controlled input + 수동 상태로 최소
      구현 (신규 의존성 추가 없음)
- [x] Refactor: 필드별 에러 상태를 하나의 객체(`errors`)로 통합, Zod
      `safeParse`의 `error.errors`를 필드별로 매핑; `form-field`/
      `form-input`/`form-error` 클래스를 `app/globals.css`에 추가해
      인라인 Tailwind 대신 사용

**완료**: 9 tests (TC-COMP-004 C004-1~7 + Enter 제출 + 취소). title
201자/description 1001자 케이스는 Zod가 이미 `createTicketSchema`에서
검증하므로 TicketForm 자체 테스트에서는 사용자 요청 범위(C004-1~7)에
맞춰 생략 — 스키마 레벨 검증은 `src/shared/validations`로 커버됨.

#### 3.2 TicketModal (+ TicketDetailView)

**파일**: `src/client/components/ticket/TicketModal.tsx`
**스펙**: `docs/TEST_CASES.md` TC-COMP-005. Modal 기반, 9개 필드 표시
(편집 가능 5개 + 읽기전용 4개: status/startedAt/completedAt/createdAt),
인라인 편집, 삭제 시 ConfirmDialog, onUpdate/onDelete 호출.

**TDD 체크리스트**:
- [x] Red: `isOpen=true`일 때 title/description/priority/plannedStartDate
      /dueDate가 표시되는 테스트 (TicketDetailView 3 tests로 읽기전용
      4필드, TicketModal 테스트로 편집가능 5필드 커버)
- [x] Red: 읽기 전용 필드(status, startedAt, completedAt, createdAt)가
      편집 불가 형태(입력 요소가 아닌 텍스트)로 렌더되는 테스트
- [x] Red: startedAt/completedAt이 `null`일 때 "-"로 표시되는 테스트
- [x] Red: 편집 후 저장 시 `onUpdate(id, data)`가 변경된 필드로 호출되는
      테스트
- [x] Red: 삭제 버튼 클릭 시 ConfirmDialog가 열리는 테스트 (바로
      `onDelete`가 호출되지 않음을 함께 확인)
- [x] Red: ConfirmDialog에서 확인 시 `onDelete(id)` 호출, 취소 시
      호출되지 않고 닫히는 테스트
- [x] Red: `onClose`가 ESC/바깥 클릭 시 호출되는 테스트(Modal 재사용 확인)
- [x] Green: Modal + TicketDetailView(읽기전용) + TicketForm(mode="edit"
      그대로 재사용, 필드별 인라인 편집 UI를 별도로 만들지 않음) +
      ConfirmDialog + Button(삭제) 조합으로 구현
- [x] Refactor: 삭제 확인 중(`isConfirmOpen`)에는 TicketForm을 숨기고
      ConfirmDialog만 렌더 — 두 컴포넌트의 "취소" 버튼이 동시에 존재해
      `getByRole` 충돌하는 문제 방지. `isOpen`이 꺼지면 `isConfirmOpen`도
      함께 닫히도록 조건 결합

**완료**: TicketDetailView 3 tests + TicketModal 9 tests. 스펙상
"인라인 편집"(필드별 클릭 전환) 대신 TicketForm(edit 모드)을 모달 안에
항상 렌더하는 방식을 택함 — 이미 Zod 검증까지 갖춘 컴포넌트를 그대로
재사용하는 편이 신규 인라인 편집 상태 머신을 만드는 것보다 실용적.

**Phase 3 완료 기준**: ✅ 두 컴포넌트 테스트 전부 통과 (TicketForm 9 +
TicketDetailView 3 + TicketModal 9 = 21 tests), TC-COMP-004(TicketForm),
TC-COMP-005(TicketModal) 대응 확인. `/preview` Phase 3 섹션에 생성/수정
폼과 상세 모달을 목 데이터로 연결해 육안 확인 완료. `npx tsc --noEmit`,
`npm run test`(142/142), `npm run lint`, `npm run build` 모두 통과.

---

### Phase 4 — 데이터 레이어 ✅ (Phase 1~3과 독립적, 병행 가능)

#### 4.1 ticketApi

**파일**: `src/client/api/ticketApi.ts`
**스펙**: 모든 API 호출을 이 모듈로 일원화 — 컴포넌트/훅이 `fetch`를
직접 호출하지 않고 `ticketApi.create(data)`처럼 이 레이어를 거친다.
`CLAUDE.md`의 API 호출 패턴(에러 시 `error.error.message` throw)을
따른다.

**TDD 체크리스트**:
- [x] Red: `ticketApi.getBoard()`가 `GET /api/tickets` 호출, 성공 시
      응답 반환, 에러 시 throw 테스트
- [x] Red: `ticketApi.create()`가 `POST /api/tickets`를 올바른 body로
      호출, 성공/에러 테스트 (`jest.fn()`으로 `global.fetch` mock)
- [x] Red: `ticketApi.update()`가 `PATCH /api/tickets/:id` 호출,
      성공/에러 테스트
- [x] Red: `ticketApi.remove()`가 `DELETE /api/tickets/:id` 호출,
      성공/에러 테스트
- [x] Red: `ticketApi.reorder()`가 `PATCH /api/tickets/reorder` 호출,
      성공/에러 테스트
- [x] Red: `ticketApi.complete()`가 `PATCH /api/tickets/:id/complete`
      호출, 성공/에러 테스트
- [x] Green: `fetch` 래퍼 함수들 구현 (`__tests__/api-client/ticketApi.test.ts`,
      18 tests)
- [x] Refactor: 공통 에러 처리(`!res.ok` → `error.error.message` throw)를
      `throwIfError` 헬퍼로 추출

#### 4.2 useTickets

**파일**: `src/client/hooks/useTickets.ts`
**스펙**: `UseTicketsReturn` 인터페이스(board, isLoading, error,
create/update/remove/reorder/complete). 낙관적 업데이트 대신, 각 액션은
`ticketApi` 호출 성공 후 `getBoard()`로 board를 다시 불러와 서버 기준
최신 상태로 맞춘다(refreshBoard) — position 재배치, isOverdue,
startedAt/completedAt 자동 설정 등 서버 파생값을 그대로 반영하기 위해
낙관적 롤백 로직보다 단순한 이 방식을 택함.

**TDD 체크리스트** (10 tests, `ticketApi`는 `jest.mock`으로 대체,
`renderHook` + `act()` 사용):
- [x] Red: `initialData`로 초기 `board`가 설정되는 테스트
- [x] Red: `create()`가 `ticketApi.create` 호출 후 `getBoard()`로
      board를 갱신하는 테스트
- [x] Red: `update()`가 `ticketApi.update` 호출 후 board를 갱신하는
      테스트
- [x] Red: `remove()`가 `ticketApi.remove` 호출 후 board를 갱신하는
      테스트
- [x] Red: `reorder()`가 `ticketApi.reorder` 호출 후 board를 갱신하는
      테스트
- [x] Red: `complete()`가 `ticketApi.complete` 호출 후 board를 갱신하는
      테스트
- [x] Red: `create()`/`remove()` 실패 시 `error` 상태 설정, board는
      이전 상태 유지, `getBoard()` 미호출 테스트
- [x] Red: API 호출 중 `isLoading=true`, 완료(성공/실패 모두) 후
      `isLoading=false`로 복귀하는 테스트
- [x] Green: 5개 액션 공통으로 "로딩 시작 → 호출 → 성공 시 refreshBoard
      → 실패 시 error 설정 → 로딩 종료" 흐름 구현
- [x] Refactor: 공통 흐름을 내부 `run()` 헬퍼로 추출해 5개 액션 간
      중복 제거

**Phase 4 완료 기준**: ✅ `npm run test -- __tests__/hooks
__tests__/api-client` 전부 통과 (ticketApi 18 + useTickets 10 = 28
tests). `npx tsc --noEmit`, `npm run lint`, `npm run build` 모두 통과.
이 Phase는 UI가 아니라 `/preview`에 별도로 연결하지 않는다.

---

### Phase 5 — 헤더 / 필터 ✅

#### 5.1 BoardHeader

**파일**: `src/client/components/board/BoardHeader.tsx`
**스펙**: "Tika" 타이틀, SearchInput(2차, 비활성 placeholder),
CreateTicketButton(클릭 시 `onCreateClick`).

**TDD 체크리스트** (4 tests):
- [x] Red: "Tika" 타이틀이 렌더되는 테스트
- [x] Red: "새 업무" 버튼 클릭 시 `onCreateClick` 호출 테스트
- [x] Red: SearchInput이 placeholder("검색 (준비 중)")와 함께 렌더되는
      테스트
- [x] Red: SearchInput이 `disabled` 상태로 렌더되는 테스트 (2차 구현
      명시)
- [x] Green: 최소 구현 (Button 재사용)
- [x] Refactor: 없음

#### 5.2 FilterBar

**파일**: `src/client/components/board/FilterBar.tsx`
**스펙**: activeFilter, onFilterChange, counts({thisWeek, overdue}), 토글
동작(활성 필터 재클릭 시 해제), 활성 필터 스타일(`aria-pressed`).

**TDD 체크리스트** (6 tests):
- [x] Red: `counts.thisWeek`, `counts.overdue`가 버튼에 숫자로 노출되는
      테스트 (각 필터 1개씩 2 tests)
- [x] Red: "이번주 업무" 버튼 클릭 시 `onFilterChange('thisWeek')` 호출
      테스트
- [x] Red: "일정 초과" 버튼 클릭 시 `onFilterChange('overdue')` 호출
      테스트
- [x] Red: `activeFilter='thisWeek'`일 때 "이번주 업무" 버튼을 다시
      클릭하면 `onFilterChange('all')` 호출(토글 해제) 테스트
- [x] Red: 활성 필터 버튼에 `aria-pressed="true"`, 비활성 필터에
      `aria-pressed="false"`가 적용되는 테스트
- [x] Green: Button 재사용, `activeFilter === filter`면 primary
      variant + `aria-pressed`, 아니면 secondary
- [x] Refactor: 토글 판정(`activeFilter === filter ? 'all' : filter`)을
      `handleClick` 헬퍼로 통합

**참고**: `isThisWeek()`/`isOverdueFilter()` 같은 필터링 순수 함수는 이번
범위에 포함하지 않았다 — FilterBar 자체는 `counts`를 props로만 받아
표시하고 토글만 담당하며, 실제로 board를 필터링하는 로직은 Phase 6
BoardContainer(또는 그 하위 훅)에서 구현한다.

**Phase 5 완료 기준**: ✅ 두 컴포넌트 테스트 전부 통과 (BoardHeader 4 +
FilterBar 6 = 10 tests). `npx tsc --noEmit`, `npm run lint`, `npm run
build` 모두 통과. `/preview` Phase 5 섹션에서 "새 업무" 클릭 시 Phase 3
생성 모달이 열리는 것, FilterBar 토글 동작을 목 데이터로 육안 확인.

---

### Phase 6 — 컨테이너 ✅

#### 6.0 사전 작업: dndHelpers, filters, useTickets 낙관적 업데이트, Board 확장

BoardContainer 구현에 앞서 아래 조각들을 먼저 준비했다 (모두 TDD):

- **`src/client/components/board/dndHelpers.ts`** (8 tests): `calculatePosition`
  (docs/API_SPEC.md §7 position 재계산 규칙 — 맨 앞 -1024, 맨 뒤 +1024,
  두 카드 사이 (prev+next)/2)과 `resolveDropTarget`(dnd-kit의
  `active.id`/`over.id`로부터 대상 칼럼과 삽입 인덱스를 판별 — over가
  칼럼 자체인지 다른 카드인지, 같은 칼럼 내 이동 시 자기 자신을 제외한
  인덱스 보정까지 처리)
- **`src/client/components/board/filters.ts`** (9 tests): `isThisWeek`
  (COMPONENT_SPEC.md §2.3 예시 코드 — 월요일/일요일 경계값 포함),
  `filterBoard`(activeFilter에 따라 TODO/IN_PROGRESS만 필터링, BACKLOG는
  항상 유지)
- **`useTickets`의 `reorder`/`complete` 낙관적 업데이트 전환** (기존
  refreshBoard 방식에서 변경, 총 12 tests): docs/COMPONENT_SPEC.md §4
  패턴대로 백업 → 호출자가 계산한 `nextBoard`를 즉시 반영 → API 호출 →
  성공 시 서버가 돌려준 `ticket`으로 해당 항목만 확정 → 실패 시 백업으로
  롤백 + error 설정. `create`/`update`/`remove`는 기존 refreshBoard
  방식을 유지(매 프레임 반응성이 필요 없고 서버 파생값을 그대로
  반영하는 편이 더 안전).
- **`Board`에 `onDragStart`/`onDragEnd`/`activeTicket` prop 추가**: 기존
  Board는 자체 `DndContext`만 감싸고 이벤트를 처리하지 않았음 —
  BoardContainer가 실제 드래그 이벤트를 제어할 수 있도록 그대로
  전달하고, `activeTicket`이 있으면 `DragOverlay` 안에 해당 TicketCard를
  렌더하도록 확장 (2 tests 추가).

#### 6.1 BoardContainer

**파일**: `src/client/components/board/BoardContainer.tsx`
**스펙**: `initialData` prop, 내부 상태 4종(activeTicket/selectedTicket/
isCreating/activeFilter — board는 useTickets가 관리), DndContext 이벤트
핸들링(대상 칼럼에 따라 complete/reorder API 분기), useTickets 사용.

**TDD 체크리스트** (9 tests, dnd-kit + useTickets는 jest.mock으로 대체):
- [x] Red: `initialData`로 초기 렌더 시 Board에 올바른 데이터가 전달되는
      테스트
- [x] Red: TicketCard 클릭 시 `selectedTicket`이 설정되고 TicketModal이
      열리는 테스트
- [x] Red: BoardHeader "새 업무" 클릭 시 `isCreating=true`가 되어
      TicketForm(생성 모달)이 열리는 테스트
- [x] Red: 생성 폼 제출 시 `useTickets.create`가 호출되는 테스트
- [x] Red: 드래그 종료 시 대상이 DONE이면 `complete(id, nextBoard)`가,
      그 외는 `reorder(input, nextBoard)`가 호출되는 분기 테스트
      (onDragEnd 핸들러를 캡처해 직접 호출하는 단위 테스트로)
- [x] Red: over가 없으면(보드 밖 드롭) 아무 API도 호출되지 않는 테스트
- [x] Red: FilterBar 변경 시 Board에 전달되는 `board`가 필터링된 결과인
      테스트 (`activeFilter` 상태 → `filterBoard` 적용 확인)
- [x] Red: TicketModal에서 삭제 확정 시 `useTickets.remove`가 호출되는
      테스트
- [x] Green: Phase 1~5 컴포넌트 + Phase 4 useTickets(낙관적 업데이트
      버전) + dndHelpers + filters를 조합해 구현
- [x] Refactor: FilterBar counts 계산을 `filterBoard` 재사용으로 통합
      (필터링 결과와 카운트가 항상 같은 로직을 쓰도록)

#### 6.2 app/(board)/page.tsx

**파일**: `app/(board)/page.tsx` (기존 `<h1>Tika</h1>` 플레이스홀더 교체)
**스펙**: 서버 컴포넌트, `ticketService.getBoard()`를 async 함수로 직접
호출해(Route Handler를 거치지 않고 서버에서 DB 직접 조회)
`BoardContainer`에 `initialData`로 전달.

**검증**:
- [x] 이 파일은 서버 컴포넌트(데이터 fetch + 위임)라 RTL 단위 테스트보다
      통합 확인이 더 적절함 — 별도 자동 테스트 없이, `npm run build` +
      `npm run dev`로 실제 DB를 연결해 브라우저에서 확인
- [x] 수동 검증: `npm run dev` 후 루트(`/`)에서 실제 DB 데이터로 4칼럼이
      렌더되는 것, "새 업무"/카드 클릭/필터 버튼이 정상 동작하는 것을
      확인

**Phase 6 완료 기준**: ✅ BoardContainer 테스트 전부 통과, 전체
210/210(`--runInBand`, DB 테스트 병렬 실행 시 발생하는 기존 격리
이슈와 무관하게 순차 실행 시 전부 통과) 테스트 통과, `npx tsc --noEmit`,
`npm run lint`, `npm run build` 성공, 실제 브라우저 수동 검증 통과.

---

## 4. 완료 정의 (Definition of Done, 전체 공통)

각 Phase 완료 시 다음을 모두 만족해야 다음 Phase로 진행한다
(`CLAUDE.md` 커밋 전 체크리스트와 동일 기준을 컴포넌트 단위로 적용):

- [ ] 해당 Phase의 모든 TDD 체크리스트 항목 완료 (Red 확인 → Green →
      Refactor)
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run test -- __tests__/components/<해당 컴포넌트>` (또는
      `__tests__/hooks`) 통과
- [ ] `npm run lint` 통과
- [ ] Props/타입이 `docs/COMPONENT_SPEC.md`와 일치 (임의 확장 없음)
- [ ] 커밋 전 `console.log` 제거 확인
- [ ] `app/preview/page.tsx`의 해당 Phase 섹션에 실제 컴포넌트를 목
      데이터로 연결해 육안 확인

Phase 6은 추가로:
- [ ] `npm run build` 성공
- [ ] 실제 브라우저(`npm run dev`)에서 수동 시각/동작 검증
