# Contract: PATCH /api/tickets/reorder

**Source of truth**: `docs/API_SPEC.md` §7. **Note**: 요청 `position`
필드의 해석은 명세에 명시적으로 정의되어 있지 않아 research.md
Decision 1(배열 인덱스)로 확정했다.

## Request
- Body:

| 필드 | 타입 | 필수 |
|---|---|---|
| ticketId | number | O |
| status | 'BACKLOG'\|'TODO'\|'IN_PROGRESS' | O |
| position | number (0-based 삽입 인덱스) | O |

```json
{ "ticketId": 3, "status": "IN_PROGRESS", "position": 0 }
```

### 처리 규칙
- 대상 티켓의 status, position 동시 업데이트 — 트랜잭션으로 원자적 처리
- position 재계산: `(prev + next) / 2`, 간격 1 미만이면 칼럼 전체
  1024 간격 재정렬, 맨 앞/뒤는 각각 `±1024`
- `to === TODO && from !== TODO` → `startedAt = now`
- `to === BACKLOG` → `startedAt = null`
- `from === DONE` → `completedAt = null`
- `updatedAt` 자동 갱신

## Response 200 OK

```json
{
  "ticket": { "...업데이트된 티켓 전체 필드" },
  "affected": [ { "id": 5, "position": 1024 } ]
}
```

`affected`: 재정렬로 position이 함께 바뀐 다른 티켓들 (없으면 빈 배열)

## Response 400
| 조건 | 메시지 |
|---|---|
| status가 DONE이거나 열거값 외 | "상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요" |

## Response 404
```json
{ "error": { "code": "TICKET_NOT_FOUND", "message": "티켓을 찾을 수 없습니다" } }
```

## 계약 테스트 매핑 (docs/TEST_CASES.md TC-API-007)

| TC | 시나리오 | spec.md 참조 |
|---|---|---|
| 007-1 | 칼럼 간 이동(BACKLOG→TODO) → status/position 갱신 | US1 / FR-001 |
| 007-2 | 같은 칼럼 내 순서 변경 → status 유지, position만 변경 | US2 / FR-007 |
| 007-3 | TODO 이동 시 startedAt 설정 | US3 Acceptance #1 / FR-003 |
| 007-4 | TODO→BACKLOG 시 startedAt=null | US3 Acceptance #2 / FR-004 |
| 007-5 | DONE→TODO: completedAt=null, startedAt 설정 | US3 Acceptance #4 / FR-006, FR-003 |
| 007-6 | DONE→BACKLOG: completedAt=null, startedAt=null | US3 / FR-006 + Decision 4(확장 규칙) |
| 007-7 | TODO→IN_PROGRESS: startedAt 유지 | US3 Acceptance #3 / FR-005 |
| 007-8 | 중간 삽입 시 다른 티켓 position 영향 → affected 포함 | US2 Acceptance #2 / FR-008 |
| 007-9 | status="DONE" 전송 → 400 | FR-002 |
| 007-10 | 잘못된 status → 400 | FR-002 |
| 007-11 | 없는 ticketId → 404 | FR-010 |
| 007-12 | updatedAt 갱신 확인 | FR-011 |
