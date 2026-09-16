# Data Model: 티켓 순서/상태 변경 (reorder)

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

새 엔티티나 스키마 변경 없음. 기존 `tickets` 테이블에 대한 상태/위치
전이(대상 티켓 1건 + 재정렬 필요 시 같은 칼럼의 여러 건)를 트랜잭션으로
처리한다.

## 신규 입력 타입

### ReorderTicketInput (신규, Zod에서 z.infer로 도출)

API_SPEC.md §7, §457 `reorderTicketSchema` 기준.

| 필드 | 타입 | 필수 | 제약조건 | 의미 |
|------|------|------|----------|------|
| ticketId | number | O | 정수, 양수 | 이동할 티켓 id |
| status | 'BACKLOG'\|'TODO'\|'IN_PROGRESS' | O | DONE 불허 | 대상 칼럼 |
| position | number | O | 정수 | 대상 칼럼 내 삽입 인덱스(0-based, research.md Decision 1) |

## 상태 전이

**대상**: BACKLOG, TODO, IN_PROGRESS 중 하나(현재 상태 무관, DONE도
출발점이 될 수 있음) → BACKLOG, TODO, IN_PROGRESS 중 하나 (DONE은
도착점 불가)

**전이 시 갱신되는 필드**:

| 필드 | 갱신 규칙 |
|---|---|
| status | 요청의 `status` |
| position | Decision 2 알고리즘으로 재계산된 값 |
| startedAt | to=TODO & from≠TODO → 현재 시각; to=BACKLOG → null(출발 칼럼 무관, research.md Decision 4); 그 외 불변 |
| completedAt | from=DONE → null; 그 외 불변 |
| updatedAt | 현재 시각 (자동) |

**변경되지 않는 필드**: title, description, priority, plannedStartDate,
dueDate, createdAt

## 부수 효과: 같은 칼럼의 다른 티켓들

간격 부족으로 재정렬이 필요하면, 대상 칼럼(이동할 티켓 제외) 전체의
position이 0, 1024, 2048...로 재계산되어 함께 UPDATE된다. 이 티켓들은
`status`, `startedAt`, `completedAt`이 변경되지 않고 `position`만
바뀐다. 응답의 `affected` 배열에 `{ id, position }`으로 포함된다
(API_SPEC.md §7 Response 예시).

## 대상 식별

`ticketId`(number)로 식별. 존재하지 않으면 `404 TICKET_NOT_FOUND`
(spec.md FR-010).
