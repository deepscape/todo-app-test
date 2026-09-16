# Data Model: 티켓 상세 조회/수정/삭제

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

이 기능은 새 엔티티나 DB 스키마 변경을 도입하지 않는다. 기존 `tickets`
테이블과 `Ticket`/`TicketWithMeta` 타입(001-board-view에서 정의)을 대상으로
단일 레코드 조회/부분 수정/삭제를 수행한다.

## 기존 엔티티 (읽기/쓰기 대상, 스키마 변경 없음)

`docs/DATA_MODEL.md` §2의 `tickets` 테이블, `src/shared/types`의 `Ticket`,
`TicketWithMeta`를 그대로 사용한다.

## 신규 입력 타입

### UpdateTicketInput (신규, Zod에서 z.infer로 도출)

API_SPEC.md §457 `updateTicketSchema` 기준. 모든 필드는 선택(optional)이며,
PATCH 부분 업데이트 의미론을 따른다.

| 필드 | 타입 | 제약조건 | 의미 |
|------|------|----------|------|
| title | string (optional) | 1~200자, 공백만 불가 | 전달 시에만 제목 변경 |
| description | string \| null (optional) | 최대 1000자 | 전달 안 함=유지, `null`=비움, 문자열=변경 |
| priority | 'LOW'\|'MEDIUM'\|'HIGH' (optional) | 열거값만 허용 | 전달 시에만 우선순위 변경 |
| plannedStartDate | string \| null (optional) | `YYYY-MM-DD` | 전달 안 함=유지, `null`=비움, 문자열=변경 |
| dueDate | string \| null (optional) | `YYYY-MM-DD`, 오늘 이후만 (null은 검증 제외) | 전달 안 함=유지, `null`=비움, 문자열=변경 |

**검증 규칙** (research.md Decision 2): "전달 안 함(undefined)"과
"명시적으로 비움(null)"을 구분해야 하므로, nullable 필드는
`.nullable().optional()`로 정의한다 (title/priority는 삭제 불가 필드라
nullable이 아님 — API_SPEC.md §4에 null 허용 명시 없음).

## 상태 전이

이 기능(GET/PATCH/DELETE `/api/tickets/:id`)은 `status`, `position`,
`startedAt`, `completedAt`을 변경하지 않는다 (spec.md FR-007,
API_SPEC.md §4 처리 규칙: "status, position, startedAt, completedAt은 이
API로 수정 불가"). 이 필드들의 전이는 다른 기능(완료 처리, 순서 변경)의
책임이다.

## 조회/수정/삭제 대상 식별

경로 파라미터 `id`(number)로 단일 레코드를 식별한다. 존재하지 않으면 세
엔드포인트 모두 `404 TICKET_NOT_FOUND`를 반환한다 (spec.md FR-002, FR-006,
FR-010).
