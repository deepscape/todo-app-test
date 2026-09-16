# Data Model: 티켓 완료 처리

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

새 엔티티나 스키마 변경 없음. 기존 `tickets` 테이블에 대한 상태 전이
(단일 레코드 UPDATE)만 수행한다.

## 상태 전이

**대상**: 임의 상태(BACKLOG, TODO, IN_PROGRESS, DONE 무관, research.md
Decision 3)의 티켓 → DONE

**전이 시 갱신되는 필드** (spec.md FR-001~FR-003, FR-005):

| 필드 | 갱신 값 |
|---|---|
| status | `'DONE'` |
| completedAt | 현재 시각 |
| position | 해당 티켓의 `min(position) - 1024` (DONE 칼럼 기준, 비어있으면 `0`) |
| updatedAt | 현재 시각 (자동, 스키마 `$onUpdate`) |

**변경되지 않는 필드**: title, description, priority, plannedStartDate,
dueDate, startedAt, createdAt — 002-ticket-detail-crud의 PATCH가 이미
이 필드들을 관리하며, 이 기능은 건드리지 않는다.

## 대상 식별

경로 파라미터 `id`(number)로 식별. 존재하지 않으면
`404 TICKET_NOT_FOUND` (spec.md FR-004, 002-ticket-detail-crud와 동일한
`getById()`/404 패턴 재사용).
