# Contract: GET /api/tickets

**Source of truth**: `docs/API_SPEC.md` §2 — 이 문서는 그 명세를 이 기능의
계약으로 재확인하며, 수정 시 반드시 API_SPEC.md를 먼저 갱신한다
(constitution Principle II).

## Request

- Method: `GET`
- Path: `/api/tickets`
- Query Parameters: 없음
- Body: 없음

## Response — 200 OK

```json
{
  "board": {
    "BACKLOG": [ { "...TicketWithMeta" } ],
    "TODO": [ { "...TicketWithMeta" } ],
    "IN_PROGRESS": [ { "...TicketWithMeta" } ],
    "DONE": [ { "...TicketWithMeta" } ]
  },
  "total": 2
}
```

- `board`: 4개 키(BACKLOG, TODO, IN_PROGRESS, DONE) 모두 항상 존재, 값은
  `TicketWithMeta[]` (data-model.md 참조), 각 배열은 `position` 오름차순
- `total`: 응답에 포함된 티켓 총 개수 (DONE 칼럼의 24시간 필터로 숨겨진
  티켓은 제외한 개수)

## Response — 에러 케이스

이 엔드포인트는 입력을 받지 않으므로 `400 VALIDATION_ERROR`가 발생하지
않는다. 예기치 못한 서버 오류만 해당된다.

| 상태 코드 | 코드 | 조건 |
|----------|------|------|
| 500 | INTERNAL_ERROR | 서버/DB 오류 |

## 계약 테스트 매핑 (참고용)

| 시나리오 | spec.md 참조 |
|---|---|
| 상태별 그룹화 | User Story 1, Acceptance #1 |
| 빈 칼럼 처리 | User Story 1, Acceptance #2 / FR-005 |
| 칼럼 내 position 정렬 | User Story 2, Acceptance #1 / FR-002 |
| isOverdue = true (기한 지남, 미완료) | User Story 3, Acceptance #1 |
| isOverdue = false (기한 지났지만 완료됨) | User Story 3, Acceptance #2 |
| Done 24시간 초과 → 숨김 | User Story 3, Acceptance #3 / FR-004 |
| Done 24시간 이내 → 노출 | User Story 3, Acceptance #4 / FR-004 |
| total 필드 정확성 | FR-006 |
