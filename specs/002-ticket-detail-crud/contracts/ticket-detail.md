# Contract: /api/tickets/:id (GET, PATCH, DELETE)

**Source of truth**: `docs/API_SPEC.md` §3(GET), §4(PATCH), §6(DELETE) — 이
문서는 그 명세를 이 기능의 계약으로 재확인한다 (constitution Principle II).

## GET /api/tickets/:id

### Request
- Path: `id` (number)

### Response 200 OK
`Ticket` 전체 필드 + `isOverdue` (data-model.md 참조, 001-board-view의
`TicketWithMeta`와 동일 셰이프).

### Response 404
```json
{ "error": { "code": "TICKET_NOT_FOUND", "message": "티켓을 찾을 수 없습니다" } }
```

### Response 400 (id가 숫자가 아님, research.md Decision 1)
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "잘못된 티켓 id입니다" } }
```

---

## PATCH /api/tickets/:id

### Request
- Path: `id` (number)
- Body: `UpdateTicketInput` (data-model.md 참조) — 모든 필드 선택

### 처리 규칙
- 전송된 필드만 업데이트
- `updatedAt` 자동 갱신
- `status`, `position`, `startedAt`, `completedAt`은 이 API로 수정 불가

### Response 200 OK
수정된 티켓 전체 데이터 (GET과 동일한 형식)

### Response 400
| 조건 | 메시지 |
|---|---|
| 제목 200자 초과 | "제목은 200자 이내로 입력해주세요" |
| 설명 1000자 초과 | "설명은 1000자 이내로 입력해주세요" |
| 잘못된 우선순위 값 | "우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요" |
| 과거 종료예정일 | "종료예정일은 오늘 이후 날짜를 선택해주세요" |
| id가 숫자가 아님 | "잘못된 티켓 id입니다" |

### Response 404
```json
{ "error": { "code": "TICKET_NOT_FOUND", "message": "티켓을 찾을 수 없습니다" } }
```

---

## DELETE /api/tickets/:id

### Request
- Path: `id` (number)
- Body: 없음

### 처리 규칙
- 하드 삭제 (soft delete 아님)

### Response 204 No Content
본문 없음 (research.md Decision 4)

### Response 404
```json
{ "error": { "code": "TICKET_NOT_FOUND", "message": "티켓을 찾을 수 없습니다" } }
```

### Response 400 (id가 숫자가 아님)
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "잘못된 티켓 id입니다" } }
```

---

## 계약 테스트 매핑 (docs/TEST_CASES.md 기준)

| TC | 시나리오 | spec.md 참조 |
|---|---|---|
| 003-1 | 존재하는 티켓 조회 → 200, 전체 데이터 | US1 Acceptance #1 |
| 003-2 | 없는 티켓 조회 → 404 | US1 Acceptance #2 / FR-002 |
| 003-3 | 잘못된 id 형식 → 400 VALIDATION_ERROR | research.md Decision 1 |
| 003-4 | isOverdue 포함 | US1 Acceptance #1 / FR-001 |
| 004-1 | 제목만 수정 → 나머지 유지 | US2 Acceptance #1 / FR-003 |
| 004-2 | 우선순위 변경 | US2 Acceptance #1 / FR-003 |
| 004-3 | description=null → 삭제 | US2 Acceptance #2 / FR-004 |
| 004-4 | dueDate=null → 삭제 | US2 Acceptance #2 / FR-004 |
| 004-5 | plannedStartDate 수정 | FR-003 |
| 004-6 | plannedStartDate=null → 삭제 | FR-004 |
| 004-7 | 없는 티켓 수정 → 404 | US2 Acceptance #3 / FR-006 |
| 004-8 | updatedAt 갱신 확인 | FR-008 |
| 004-9 | status 수정 불가 | FR-007 |
| 006-1 | 정상 삭제 → 204, 재조회 시 404 | US3 Acceptance #1 / FR-009 |
| 006-2 | 없는 티켓 삭제 → 404 | US3 Acceptance #2 / FR-010 |
