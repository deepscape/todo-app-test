# Tika - 프론트엔드 구현 계획 (FRONTEND_TASK.md)

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

---

## 1. 의존성 그래프

```
Level 0 (순수 UI, 의존성 없음)
├── Badge
└── Button

Level 1 (Level 0 사용)
├── Modal              (독립적, Level 0 미사용이지만 같은 레벨로 묶음)
└── ConfirmDialog       → Button

Level 2 (도메인 리프 컴포넌트)
├── TicketCard          → Badge
└── TicketForm          → Button, src/shared/validations/ticket.ts (Zod)

Level 3 (Level 1+2 조합)
├── ColumnHeader         (독립적 소형 컴포넌트, Badge 스타일 재사용 가능)
└── TicketModal          → Modal, TicketForm, ConfirmDialog, Button
                           (+ TicketDetailView: TicketModal 내부 서브파트)

Level 4
└── Column               → TicketCard, ColumnHeader, @dnd-kit/sortable

Level 5 (상태/통신 레이어 — UI 트리와 독립적으로 병행 개발 가능)
├── ticketApi            → src/shared/types, fetch
└── useTickets            → ticketApi

Level 6
├── FilterBar             (독립적, Level 0 스타일만 사용)
└── BoardHeader           → Button

Level 7
└── Board                 → Column, @dnd-kit/core (DndContext, DragOverlay)

Level 8 (컨테이너)
└── BoardContainer         → Board, BoardHeader, FilterBar, TicketModal,
                              useTickets

Level 9 (엔트리)
└── app/(board)/page.tsx    → BoardContainer (서버 컴포넌트, 초기 데이터 fetch)
```

**병렬 진행 가능 지점**: Level 5(useTickets/ticketApi)는 Level 0~4의 UI
트리와 데이터/타입 계약(`TicketWithMeta`, `BoardData`)만 공유하고 실제
렌더 의존성은 없으므로, UI를 만드는 동안 별도로 병행 개발해도 무방하다.
다만 이 문서는 순서를 단순하게 유지하기 위해 UI를 먼저 끝낸 뒤 Hook을
배치했다 — 팀 상황에 따라 Phase 3와 Phase 5를 맞바꿔도 문제없다.

---

## 2. Phase 그룹핑

| Phase | 이름 | 포함 컴포넌트 | 선행 조건 |
|---|---|---|---|
| 1 | 공통 프리미티브 | Badge, Button | 없음 (globals.css 토큰만 필요, 완료됨) |
| 2 | 공통 오버레이 | Modal, ConfirmDialog | Phase 1 |
| 3 | 티켓 도메인 리프 | TicketCard, TicketForm | Phase 1 |
| 4 | 모달/칼럼 헤더 | TicketModal(+TicketDetailView), ColumnHeader | Phase 2, 3 |
| 5 | 칼럼 | Column | Phase 4 (TicketCard, ColumnHeader) |
| 6 | 데이터 레이어 | ticketApi, useTickets | 없음 (Phase 1~5와 독립적, 병행 가능) |
| 7 | 헤더/필터 | BoardHeader, FilterBar | Phase 1 |
| 8 | 보드 + DnD | Board | Phase 5 |
| 9 | 컨테이너 + 페이지 | BoardContainer, page.tsx | Phase 6, 7, 8 |

---

## 3. Phase별 컴포넌트 상세 + TDD 체크리스트

각 컴포넌트 항목은 COMPONENT_SPEC.md의 원문 스펙을 그대로 인용하며,
테스트는 React Testing Library + `@testing-library/user-event` 기준으로
작성한다 (`__tests__/components/<name>.test.tsx`).

### Phase 1 — 공통 프리미티브

#### 1.1 Badge

**파일**: `src/client/components/ui/Badge.tsx`
**스펙**: 우선순위 표시 LOW(회색)/MEDIUM(파란색)/HIGH(빨간색), 작은 텍스트
+ 둥근 패딩. `app/globals.css`의 `--color-priority-{low,medium,high}-{bg,text}`
토큰을 사용한다.

**TDD 체크리스트**:
- [ ] Red: `priority="LOW"` 렌더 시 `bg-priority-low-bg` 클래스와 텍스트
      "LOW" 노출을 기대하는 테스트 작성 → 컴포넌트 없어 실패 확인
- [ ] Red: `priority="MEDIUM"` → `bg-priority-medium-bg` 클래스 테스트
- [ ] Red: `priority="HIGH"` → `bg-priority-high-bg` 클래스 테스트
- [ ] Green: `TicketPriority`를 prop으로 받는 최소 구현
- [ ] Refactor: 색상 매핑을 `Record<TicketPriority, string>` 상수로 추출
- [ ] 시각 확인: `npm run dev`로 3가지 우선순위 뱃지가 스펙 색상과
      일치하는지 육안 확인

#### 1.2 Button

**파일**: `src/client/components/ui/Button.tsx`
**스펙**: variant(primary/secondary/danger/ghost), size(sm/md/lg), 로딩
상태 지원.

**TDD 체크리스트**:
- [ ] Red: 기본 렌더 시 children 텍스트 노출 테스트
- [ ] Red: `variant="danger"` → `bg-danger` 클래스 포함 테스트
- [ ] Red: `isLoading` → 버튼 `disabled` 속성 + 로딩 인디케이터(예:
      `role="status"` 또는 스피너 요소) 노출 테스트
- [ ] Red: `onClick` 핸들러가 클릭 시 호출되는지 `userEvent.click` 테스트
- [ ] Red: `isLoading`일 때 `onClick`이 호출되지 않는지 테스트
- [ ] Green: 4개 variant × 3개 size 클래스 매핑 + loading/disabled 로직
      구현
- [ ] Refactor: variant/size 클래스 매핑을 별도 상수 객체로 추출

**Phase 1 완료 기준**: `npm run test -- __tests__/components/Badge
__tests__/components/Button` 전부 통과, `npx tsc --noEmit` 통과.

---

### Phase 2 — 공통 오버레이

#### 2.1 Modal

**파일**: `src/client/components/ui/Modal.tsx`
**스펙**: 오버레이 + 중앙 정렬 컨테이너, ESC 닫기, 바깥 클릭 닫기,
열림/닫힘 애니메이션, body 스크롤 잠금.

**TDD 체크리스트**:
- [ ] Red: `isOpen=false`일 때 내용이 DOM에 없거나 보이지 않음을 확인하는
      테스트
- [ ] Red: `isOpen=true`일 때 children이 렌더되는 테스트
- [ ] Red: ESC 키 입력(`userEvent.keyboard('{Escape}')`) 시 `onClose` 호출
      테스트
- [ ] Red: 오버레이(바깥 영역) 클릭 시 `onClose` 호출, 모달 컨텐츠 내부
      클릭 시는 호출되지 않는 테스트(이벤트 버블링 구분)
- [ ] Red: 열려있는 동안 `document.body.style.overflow`가 `hidden`으로
      설정되고, 닫히면 원복되는 테스트
- [ ] Green: 최소 구현 (오버레이 div + 이벤트 리스너 + body 스크롤 잠금
      useEffect)
- [ ] Refactor: 애니메이션은 Tailwind transition 유틸리티로 정리

#### 2.2 ConfirmDialog

**파일**: `src/client/components/ui/ConfirmDialog.tsx`
**스펙**: "정말 삭제하시겠습니까?" 확인 다이얼로그, 확인/취소 버튼, 위험
동작은 빨간색 확인 버튼. (Modal을 내부적으로 사용)

**TDD 체크리스트**:
- [ ] Red: 메시지 텍스트 prop이 그대로 렌더되는 테스트
- [ ] Red: "확인" 버튼 클릭 시 `onConfirm` 호출 테스트
- [ ] Red: "취소" 버튼 클릭 시 `onCancel` 호출, `onConfirm`은 호출 안 됨
      테스트
- [ ] Red: 확인 버튼이 `Button` variant="danger"로 렌더되는지(danger 클래스
      확인) 테스트
- [ ] Green: Modal + Button(Phase 1) 조합으로 최소 구현
- [ ] Refactor: 없음 (소형 컴포넌트)

**Phase 2 완료 기준**: 해당 테스트 전부 통과, Modal이 이후 TicketModal에서
재사용 가능한 형태인지(children, isOpen, onClose props) 검토.

---

### Phase 3 — 티켓 도메인 리프

#### 3.1 TicketCard

**파일**: `src/client/components/ticket/TicketCard.tsx`
**스펙**: 제목(1줄 말줄임), 우선순위 뱃지, 종료예정일(YYYY-MM-DD), 오버듀
표시(빨간 테두리/아이콘). `useSortable`로 드래그 가능(이 Phase에서는 DnD
컨텍스트 없이 단독 렌더 테스트만 — 실제 드래그 동작 검증은 Phase 8
Column/Board 통합 단계에서). 클릭 시 `onClick` 호출(드래그와 클릭 구분).
`role="button"`, `aria-label="티켓: {title}"`, 키보드 포커스+Enter.

**TDD 체크리스트**:
- [ ] Red: `ticket.title`이 렌더되는 테스트
- [ ] Red: `ticket.priority`에 따라 Badge가 올바른 색상으로 렌더되는 테스트
      (Phase 1 Badge 재사용 확인)
- [ ] Red: `ticket.dueDate`가 있으면 YYYY-MM-DD 형식으로 노출, 없으면
      노출 안 됨 테스트
- [ ] Red: `ticket.isOverdue === true`일 때 오버듀 시각 표시(예:
      `border-overdue` 클래스 또는 특정 아이콘 요소) 테스트
- [ ] Red: 클릭 시 `onClick` 호출 테스트
- [ ] Red: `role="button"`, `aria-label`이 "티켓: {title}" 형식인지 테스트
- [ ] Red: Tab으로 포커스 가능 + Enter 키 입력 시 `onClick` 호출 테스트
      (`userEvent.tab()` + `userEvent.keyboard('{Enter}')`)
- [ ] Green: 최소 구현 (`useSortable` 훅 연결은 하되, 이 Phase의 테스트는
      DndContext 없이 렌더만 검증 — `useSortable`이 Provider 없이도 크래시
      하지 않는지 확인 필요, 크래시하면 테스트를 `DndContext`로 감싸는
      테스트 헬퍼 추가)
- [ ] Refactor: 오버듀 스타일과 일반 스타일 분기를 className 유틸 함수로
      정리

#### 3.2 TicketForm

**파일**: `src/client/components/ticket/TicketForm.tsx`
**스펙**: mode(create/edit), 필드 5개(title/description/priority/
plannedStartDate/dueDate), 클라이언트 Zod 검증(`src/shared/validations/ticket.ts`
공유), Enter/제출 버튼 제출, 제출 중 버튼 비활성화+로딩, 성공 시 초기화
(create) 또는 모달 닫기(edit).

**TDD 체크리스트**:
- [ ] Red: 5개 필드가 모두 렌더되는지(label 또는 placeholder 텍스트 기준
      `getByLabelText` 등) 테스트
- [ ] Red: `mode="edit"` + `initialData`로 필드에 기존 값이 채워지는 테스트
- [ ] Red: title 빈 값으로 제출 시 "제목을 입력해주세요" 에러가 인라인
      노출되고 `onSubmit`이 호출되지 않는 테스트
- [ ] Red: title 201자 입력 시 "제목은 200자 이내로 입력해주세요" 에러
      테스트
- [ ] Red: description 1001자 입력 시 "설명은 1000자 이내로 입력해주세요"
      에러 테스트
- [ ] Red: dueDate에 과거 날짜 입력 시 "종료예정일은 오늘 이후 날짜를
      선택해주세요" 에러 테스트
- [ ] Red: 유효한 값 입력 후 제출 버튼 클릭 시 `onSubmit`이 올바른
      데이터로 호출되는 테스트
- [ ] Red: 유효한 값 입력 후 Enter 키로도 제출되는 테스트
- [ ] Red: `isLoading=true`일 때 제출 버튼이 disabled인지 테스트
- [ ] Red: `onCancel`이 취소 버튼 클릭 시 호출되는 테스트
- [ ] Green: `react-hook-form` 없이 controlled input + 수동 상태로 최소
      구현하거나, 이미 프로젝트에 폼 라이브러리가 없으므로 순수 useState
      기반으로 구현 (신규 의존성 추가는 이 계획 범위 밖 — 필요 시 별도
      결정)
- [ ] Refactor: 필드별 에러 상태를 하나의 객체로 통합, Zod
      `safeParse`의 `error.errors`를 필드별로 매핑하는 헬퍼 추출

**Phase 3 완료 기준**: 두 컴포넌트 테스트 전부 통과, `docs/TEST_CASES.md`의
TC-COMP-001(TicketCard), TC-COMP-004(TicketForm) 대응 여부 확인 (해당
문서에 상세 케이스가 없다면 이 체크리스트가 사실상 그 역할을 대체함을
인지).

---

### Phase 4 — 모달 / 칼럼 헤더

#### 4.1 TicketModal (+ TicketDetailView)

**파일**: `src/client/components/ticket/TicketModal.tsx`
**스펙**: Modal 기반, 9개 필드 표시(편집 가능 5개 + 읽기전용 4개: status/
startedAt/completedAt/createdAt), 인라인 편집, 삭제 시 ConfirmDialog,
onUpdate/onDelete 호출.

**TDD 체크리스트**:
- [ ] Red: `isOpen=true`일 때 title/description/priority/plannedStartDate
      /dueDate가 표시되는 테스트
- [ ] Red: 읽기 전용 필드(status, startedAt, completedAt, createdAt)가
      편집 불가 형태(입력 요소가 아닌 텍스트)로 렌더되는 테스트
- [ ] Red: startedAt/completedAt이 `null`일 때 "-" 또는 빈 상태로 표시되는
      테스트
- [ ] Red: 필드 클릭 시 편집 모드로 전환(입력 요소 등장)되는 테스트
- [ ] Red: 편집 후 저장 시 `onUpdate(id, data)`가 변경된 필드로 호출되는
      테스트
- [ ] Red: 삭제 버튼 클릭 시 ConfirmDialog가 열리는 테스트
- [ ] Red: ConfirmDialog에서 확인 시 `onDelete(id)` 호출 테스트
- [ ] Red: `onClose`가 ESC/바깥 클릭 시 호출되는 테스트(Modal 재사용 확인)
- [ ] Green: Modal + TicketForm(edit 모드 일부 재사용 검토, 또는 자체
      인라인 편집 UI) + ConfirmDialog + Button 조합으로 구현
- [ ] Refactor: TicketDetailView(읽기 전용 뷰)를 별도 서브컴포넌트로
      분리할지 검토 — COMPONENT_SPEC.md 계층도에는 별도 노드로 존재하므로
      분리 권장

#### 4.2 ColumnHeader

**파일**: `src/client/components/board/ColumnHeader.tsx`
(COMPONENT_SPEC.md 계층도에는 명시되어 있으나 별도 절 없음 — Column
스펙의 "칼럼 헤더에 칼럼명 + 티켓 수 뱃지 표시" 요구사항을 이 컴포넌트로
분리)

**TDD 체크리스트**:
- [ ] Red: `label`(칼럼명) prop이 렌더되는 테스트
- [ ] Red: `count`(티켓 수) prop이 뱃지 형태로 렌더되는 테스트
- [ ] Green: 최소 구현
- [ ] Refactor: 없음 (소형 컴포넌트)

**Phase 4 완료 기준**: TicketModal 테스트 전부 통과, TC-COMP-005
(TicketModal) 대응.

---

### Phase 5 — Column

**파일**: `src/client/components/board/Column.tsx`
**스펙**: `SortableContext` + `useDroppable`, 빈 상태 안내 문구, 칼럼별
특수 동작(BACKLOG=사이드바 스타일, DONE=서버가 이미 24시간 필터링해서
내려주므로 프론트는 받은 그대로 렌더).

**TDD 체크리스트**:
- [ ] Red: `tickets` 배열의 각 항목이 TicketCard로 렌더되는 테스트 (DnD
      컨텍스트 필요 — 테스트 헬퍼로 `DndContext`+`SortableContext` 래퍼
      작성)
- [ ] Red: `tickets=[]`일 때 "이 칼럼에 티켓이 없습니다" 안내 텍스트
      노출 테스트
- [ ] Red: ColumnHeader에 `status`에 대응하는 칼럼명(`COLUMN_LABELS`)과
      `tickets.length`가 전달되는 테스트
- [ ] Red: TicketCard 클릭 시 `onTicketClick(ticket)`이 해당 티켓으로
      호출되는 테스트
- [ ] Green: 최소 구현 (SortableContext 아이템 id 배열은 `tickets.map(t
      => t.id)`)
- [ ] Refactor: BACKLOG 전용 스타일 분기를 className 유틸로 정리

**Phase 5 완료 기준**: DnD 컨텍스트 안에서 Column이 정상 렌더/클릭 동작함을
테스트로 확인. 실제 드래그 앤 드롭 자체(포인터 이벤트 시뮬레이션)는 이
Phase에서 검증하지 않는다 — jsdom에서 `@dnd-kit`의 포인터 센서를 완전히
시뮬레이션하는 것은 비용 대비 실익이 낮으므로, 드래그 로직 검증은
useTickets(Phase 6)의 순수 함수 단위 테스트 + Phase 9 수동 브라우저
검증으로 커버한다.

---

### Phase 6 — 데이터 레이어 (UI와 독립적으로 병행 가능)

#### 6.1 ticketApi

**파일**: `src/client/api/ticketApi.ts`
**스펙**: 모든 API 호출을 이 모듈로 일원화. `CLAUDE.md`의 API 호출 패턴
(에러 시 `error.error.message` throw)을 따른다.

**TDD 체크리스트**:
- [ ] Red: `ticketApi.create()`가 `POST /api/tickets`를 올바른 body로
      호출하는 테스트 (`global.fetch` mock)
- [ ] Red: `ticketApi.update()`가 `PATCH /api/tickets/:id` 호출 테스트
- [ ] Red: `ticketApi.remove()`가 `DELETE /api/tickets/:id` 호출 테스트
- [ ] Red: `ticketApi.reorder()`가 `PATCH /api/tickets/reorder` 호출
      테스트
- [ ] Red: `ticketApi.complete()`가 `PATCH /api/tickets/:id/complete`
      호출 테스트
- [ ] Red: `ticketApi.getBoard()`(또는 동등 함수, 초기 로드용)가
      `GET /api/tickets` 호출 테스트
- [ ] Red: fetch 응답이 `!res.ok`일 때 `error.error.message`를 담은
      Error를 throw하는 테스트 (각 함수 공통)
- [ ] Green: `fetch` 래퍼 함수들 구현
- [ ] Refactor: 공통 요청/에러 처리 로직을 내부 헬퍼로 추출 (중복 제거)

#### 6.2 useTickets

**파일**: `src/client/hooks/useTickets.ts`
**스펙**: `UseTicketsReturn` 인터페이스(board, isLoading, error,
create/update/remove/reorder/complete), 낙관적 업데이트 패턴(백업→즉시
반영→API→확정 또는 롤백).

**TDD 체크리스트**:
- [ ] Red: `@testing-library/react`의 `renderHook`으로 초기 `board`가
      `initialData`와 동일한지 테스트
- [ ] Red: `create()` 호출 시 낙관적으로 board에 임시 티켓이 즉시
      반영되는지(await 이전 시점의 상태) 테스트 — API mock을 지연시켜
      확인
- [ ] Red: `create()` 성공 시 board가 서버 응답으로 확정되는 테스트
- [ ] Red: `create()` 실패(API mock reject) 시 board가 낙관적 업데이트
      이전 상태로 롤백되고 `error`가 설정되는 테스트
- [ ] Red: `update()`가 해당 티켓 필드만 낙관적으로 반영, 실패 시 롤백
      테스트
- [ ] Red: `remove()`가 낙관적으로 목록에서 제거, 실패 시 복원 테스트
- [ ] Red: `reorder()`가 상태/위치를 낙관적으로 반영, 실패 시 롤백 테스트
- [ ] Red: `complete()`가 DONE 칼럼으로 낙관적 이동, 실패 시 롤백 테스트
- [ ] Green: 각 액션에 대해 "백업 → setState 낙관적 반영 → try
      ticketApi 호출 → 성공 시 재조정 catch 시 백업으로 복원 + error 설정"
      패턴 구현
- [ ] Refactor: 낙관적 업데이트 공통 로직(백업/롤백)을 내부 헬퍼로 추출해
      5개 액션 간 중복 제거

**Phase 6 완료 기준**: `npm run test -- __tests__/hooks
__tests__/api-client`(또는 실제 배치한 경로) 전부 통과. 이 Phase는 UI
Phase 1~5와 파일/모듈이 겹치지 않으므로 어느 시점에 진행해도 무방하나,
Phase 9(BoardContainer)는 이 Phase 완료를 반드시 선행해야 한다.

---

### Phase 7 — 헤더 / 필터

#### 7.1 BoardHeader

**파일**: `src/client/components/board/BoardHeader.tsx`
**스펙**: SearchInput(2차, 비활성 placeholder), CreateTicketButton(클릭
시 `onCreateClick`).

**TDD 체크리스트**:
- [ ] Red: "새 업무" 버튼 클릭 시 `onCreateClick` 호출 테스트
- [ ] Red: SearchInput이 `disabled` 상태로 렌더되는 테스트 (2차 구현
      명시)
- [ ] Green: 최소 구현 (Button 재사용)
- [ ] Refactor: 없음

#### 7.2 FilterBar

**파일**: `src/client/components/board/FilterBar.tsx`
**스펙**: activeFilter, onFilterChange, counts({thisWeek, overdue}), 토글
동작(활성 필터 재클릭 시 해제), 필터 로직은 순수 함수로 분리(`isThisWeek`
등 — COMPONENT_SPEC.md 예시 코드 그대로 구현).

**TDD 체크리스트**:
- [ ] Red: "이번주 업무" 버튼 클릭 시 `onFilterChange('thisWeek')` 호출
      테스트
- [ ] Red: "일정 초과" 버튼 클릭 시 `onFilterChange('overdue')` 호출
      테스트
- [ ] Red: `activeFilter='thisWeek'`일 때 "이번주 업무" 버튼을 다시
      클릭하면 `onFilterChange('all')` 호출(토글 해제) 테스트
- [ ] Red: `counts.thisWeek`, `counts.overdue`가 버튼에 숫자로 노출되는
      테스트
- [ ] Red(순수 함수): `isThisWeek()` — 이번 주 월~일 범위 dueDate를 가진
      TODO/IN_PROGRESS 티켓만 true, BACKLOG/DONE은 항상 false인 테스트
      (월요일/일요일 경계값 포함)
- [ ] Red(순수 함수): `isOverdueFilter()` (또는 단순히 `ticket.isOverdue`
      직접 사용 — 서버가 이미 계산해 내려주므로 별도 함수 불필요할 수
      있음, 구현 시 결정)
- [ ] Green: 최소 구현
- [ ] Refactor: 필터 로직 함수를 `src/client/components/board/filters.ts`
      등으로 분리해 단위 테스트 용이성 확보

**Phase 7 완료 기준**: 두 컴포넌트 테스트 전부 통과.

---

### Phase 8 — Board (DnD 통합)

**파일**: `src/client/components/board/Board.tsx`
**스펙**: DndContext+DragOverlay로 전체 감싸기, Backlog 사이드바 + 3칼럼
그리드 배치, 반응형(데스크톱 4칼럼/태블릿 2칼럼+Backlog 접기/모바일
단일+탭전환 — NFR-002).

**TDD 체크리스트**:
- [ ] Red: `board` prop의 4개 칼럼이 각각 Column으로 렌더되는 테스트
- [ ] Red: TicketCard 클릭이 `onTicketClick`까지 전파되는 테스트(Board→
      Column→TicketCard 통합 확인)
- [ ] Red: `onDragStart` 발생 시 DragOverlay에 드래그 중인 카드가 표시되는
      테스트 (`@dnd-kit/core`의 테스트 유틸 또는 수동 이벤트 dispatch 필요
      — 어려우면 이 항목은 "구현 후 수동 브라우저 검증"으로 대체하고
      체크리스트에 그 사실을 명시)
- [ ] Green: 최소 구현
- [ ] Refactor: 반응형 레이아웃 클래스를 Tailwind 브레이크포인트
      (`md:`, `lg:`)로 정리

**Phase 8 완료 기준**: 렌더/클릭 전파 테스트 통과. 드래그 자체의 최종
검증은 Phase 9 이후 실제 브라우저 수동 테스트(`npm run dev`)로 수행한다
— jsdom 환경에서 포인터 센서 기반 DnD 전체 흐름을 신뢰성 있게
시뮬레이션하기 어렵다는 `@dnd-kit` 자체의 알려진 테스트 한계를 반영한
현실적 범위 설정이다.

---

### Phase 9 — 컨테이너 + 페이지

#### 9.1 BoardContainer

**파일**: `src/client/components/board/BoardContainer.tsx`
**스펙**: `initialData` prop, 내부 상태 5종(board/activeTicket/
selectedTicket/isCreating/activeFilter), DndContext 이벤트 핸들링(대상
칼럼에 따라 complete/reorder API 분기), useTickets 사용.

**TDD 체크리스트**:
- [ ] Red: `initialData`로 초기 렌더 시 Board에 올바른 데이터가 전달되는
      테스트
- [ ] Red: TicketCard 클릭 시 `selectedTicket`이 설정되고 TicketModal이
      열리는 테스트
- [ ] Red: BoardHeader "새 업무" 클릭 시 `isCreating=true`가 되어
      TicketForm(생성 모달)이 열리는 테스트
- [ ] Red: 생성 폼 제출 시 `useTickets.create` 경유로 board에 새 티켓이
      반영되는 테스트 (useTickets는 실제 구현 사용 + fetch mock, 또는
      useTickets 자체를 mock)
- [ ] Red: 드래그 종료 시 대상이 DONE이면 `complete()`가, 그 외는
      `reorder()`가 호출되는 분기 테스트 (onDragEnd 핸들러를 직접 호출하는
      단위 테스트로 — 실제 포인터 드래그 시뮬레이션 대신)
- [ ] Red: FilterBar 변경 시 Board에 전달되는 `board`가 필터링된 결과인
      테스트 (`activeFilter` 상태 → 필터 함수 적용 확인)
- [ ] Red: TicketModal에서 삭제 확정 시 `useTickets.remove` 경유로 board에서
      제거되는 테스트
- [ ] Green: Phase 1~8 컴포넌트 + Phase 6 useTickets를 조합해 구현
- [ ] Refactor: onDragEnd의 분기 로직(Done 판별 등)을 별도 순수 함수로
      추출해 테스트 용이성 확보

#### 9.2 app/(board)/page.tsx

**파일**: `app/(board)/page.tsx` (기존 `<h1>Tika</h1>` 플레이스홀더 교체)
**스펙**: 서버 컴포넌트, 초기 보드 데이터를 서버에서 fetch해
`BoardContainer`에 `initialData`로 전달.

**TDD 체크리스트**:
- [ ] 이 파일은 서버 컴포넌트(데이터 fetch + 위임)라 RTL 단위 테스트보다
      통합 확인이 더 적절함 — 별도 자동 테스트 없이, `npm run dev`로 실제
      DB(seed 데이터 활용, `npm run db:seed`)를 연결해 브라우저에서
      전체 흐름 수동 검증
- [ ] 수동 검증 시나리오: 보드 진입 시 4칼럼에 시드 데이터가 정확히
      분류되어 보이는지, 티켓 생성/수정/삭제/드래그/완료 전체 플로우가
      실제로 동작하는지 (`docs/API_SPEC.md` 7개 엔드포인트 전부 UI를
      통해 왕복 확인)

**Phase 9 완료 기준**: BoardContainer 테스트 전부 통과, `npm run build`
성공, 실제 브라우저 수동 검증(위 시나리오) 통과.

---

## 4. 전체 실행 순서 요약

```
Phase 1 (Badge, Button)
   ↓
Phase 2 (Modal, ConfirmDialog)         Phase 6 (ticketApi, useTickets)
   ↓                                    — Phase 1~5와 독립적, 아무 때나 병행 가능
Phase 3 (TicketCard, TicketForm)
   ↓
Phase 4 (TicketModal, ColumnHeader)
   ↓
Phase 5 (Column)
   ↓
Phase 7 (BoardHeader, FilterBar)  ←── Phase 1만 있으면 충분, Phase 5와 병행 가능
   ↓
Phase 8 (Board)
   ↓
Phase 9 (BoardContainer, page.tsx)  ←── Phase 6, 7, 8 모두 필요
```

**최소 크리티컬 패스**: 1 → 2 → 3 → 4 → 5 → 8 → 9 (Phase 6, 7은 이
경로와 병행 가능하지만 늦어도 Phase 9 시작 전에는 완료되어야 한다).

---

## 5. 완료 정의 (Definition of Done, 전체 공통)

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

Phase 8, 9는 추가로:
- [ ] `npm run build` 성공
- [ ] 실제 브라우저(`npm run dev`)에서 수동 시각/동작 검증
