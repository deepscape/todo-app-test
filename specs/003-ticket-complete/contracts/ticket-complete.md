# Contract: PATCH /api/tickets/:id/complete

**Source of truth**: `docs/API_SPEC.md` §5.

## Request
- Path: `id` (number)
- Body: 없음

### 처리 규칙
- `status`를 `DONE`으로 변경
- `completedAt`을 현재 시각으로 설정
- `position`은 DONE 칼럼의 `min(position) - 1024` (맨 위 배치)
- `updatedAt` 자동 갱신

## Response 200 OK
완료된 티켓 전체 데이터 (GET `/api/tickets/:id`와 동일한 형식,
`isOverdue` 포함 — 완료된 티켓은 `isOverdue`가 항상 `false`)

## Response 404
```json
{ "error": { "code": "TICKET_NOT_FOUND", "message": "티켓을 찾을 수 없습니다" } }
```

## Response 400 (id가 숫자가 아님, 002-ticket-detail-crud와 동일 패턴)
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "잘못된 티켓 id입니다" } }
```

## 계약 테스트 매핑 (docs/TEST_CASES.md TC-API-005)

| TC | 시나리오 | spec.md 참조 |
|---|---|---|
| 005-1 | 정상 완료 처리 → 200, status=DONE, completedAt 설정 | US1 Acceptance #1 / FR-001, FR-002 |
| 005-2 | completedAt ≈ 현재 시각 | FR-002 |
| 005-3 | Done 칼럼 맨 위 position 할당 | US2 Acceptance #1 / FR-003 |
| 005-4 | 없는 티켓 완료 → 404 | US1 Acceptance #2 / FR-004 |
| 005-5 | updatedAt 갱신 확인 | FR-005 |
| (추가) | 이미 DONE인 티켓 재완료 처리 → 200, completedAt 갱신 | Edge Cases |
