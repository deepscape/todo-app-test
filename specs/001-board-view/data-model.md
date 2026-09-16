# Data Model: 칸반 보드 조회 (GET /api/tickets)

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

이 기능은 새 엔티티나 스키마 변경을 도입하지 않는다. 기존 `tickets` 테이블
(docs/DATA_MODEL.md §2)을 읽기 전용으로 조회하고, 파생 필드를 추가해 응답
형태로 재구성한다.

## 기존 엔티티 (읽기 전용 참조)

### Ticket

`docs/DATA_MODEL.md` §2~§4에 정의된 `tickets` 테이블 및
`src/shared/types`의 `Ticket` 인터페이스를 그대로 사용한다. 이 기능에서
스키마 변경은 없다.

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | 티켓 고유 식별자 |
| title | string | 제목 |
| description | string \| null | 설명 |
| status | TicketStatus | BACKLOG \| TODO \| IN_PROGRESS \| DONE |
| priority | TicketPriority | LOW \| MEDIUM \| HIGH |
| position | number | 칼럼 내 정렬 순서 |
| plannedStartDate | string \| null | 시작예정일 (YYYY-MM-DD) |
| dueDate | string \| null | 종료예정일 (YYYY-MM-DD) |
| startedAt | Date \| null | 시작 시각 (시스템 자동) |
| completedAt | Date \| null | 완료 시각 (시스템 자동) |
| createdAt | Date | 생성 시각 |
| updatedAt | Date | 수정 시각 |

## 파생 타입 (이 기능에서 응답 구성에 사용)

`src/shared/types`에 이미 정의되어 있으며 (DATA_MODEL.md §4), 이 기능이
최초로 실제 사용한다.

### TicketWithMeta

```typescript
interface TicketWithMeta extends Ticket {
  isOverdue: boolean; // dueDate < 오늘 && status !== DONE
}
```

**계산 규칙** (FR-003, spec.md Edge Cases):
- `dueDate`가 없으면 항상 `false`
- `status === 'DONE'`이면 항상 `false`
- 그 외: `dueDate < 오늘 날짜(YYYY-MM-DD)`면 `true`

### BoardData

```typescript
type BoardData = Record<TicketStatus, TicketWithMeta[]>;
```

**구성 규칙** (FR-001, FR-002, FR-004):
- 키는 `COLUMN_ORDER` 4개 상태(BACKLOG, TODO, IN_PROGRESS, DONE) 고정
- 각 배열은 해당 상태의 `TicketWithMeta`를 `position` 오름차순으로 정렬
- `DONE` 배열은 `completedAt` 기준 24시간 이내인 티켓만 포함 (FR-004) —
  아래 "Done 가시성" 규칙 참조
- 티켓이 없는 상태는 빈 배열(`[]`)

## 비즈니스 규칙 (신규 로직 없음, 기존 규칙의 최초 적용)

### Done 가시성 (FR-004)

```typescript
function isDoneVisible(ticket: Ticket): boolean {
  if (ticket.status !== 'DONE') return false;
  if (!ticket.completedAt) return false;
  const diffMs = Date.now() - ticket.completedAt.getTime();
  return diffMs <= 24 * 60 * 60 * 1000;
}
```

이 판정은 `DONE` 칼럼 배열을 구성할 때만 적용되며, 24시간이 지난 Done
티켓은 응답에서 완전히 제외된다 (삭제되지 않고 조회에서만 숨김).

## 상태 전이

이 기능은 상태를 변경하지 않는 읽기 전용(GET) 엔드포인트다. 상태 전이는
범위 밖이며 다른 엔드포인트(`PATCH /api/tickets/reorder`,
`PATCH /api/tickets/:id/complete`)에서 처리된다.

## 검증 규칙

없음. 이 엔드포인트는 요청 바디/쿼리 파라미터를 받지 않으므로 Zod 스키마를
정의하지 않는다 (research.md Decision 1).
