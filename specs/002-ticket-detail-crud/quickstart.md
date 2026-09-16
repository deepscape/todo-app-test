# Quickstart: 티켓 상세 조회/수정/삭제

**Feature**: [spec.md](./spec.md) | **Contract**: [contracts/ticket-detail.md](./contracts/ticket-detail.md)

## 사전 준비

```bash
npm install
POSTGRES_URL='postgres://...' npm run db:migrate
npm run dev
```

## 검증 시나리오 1 — 상세 조회 (User Story 1)

```bash
# 티켓 생성 후 id 확보
curl -s -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"title":"quickstart 검증용"}' | jq

# 위 응답의 id로 상세 조회
curl -s http://localhost:3000/api/tickets/1 | jq

# 없는 id 조회 → 404
curl -s -i http://localhost:3000/api/tickets/999999 | head -1
```

**기대 결과**: 생성 응답과 조회 응답의 필드가 동일(+isOverdue 추가), 없는
id는 404 + `TICKET_NOT_FOUND`.

## 검증 시나리오 2 — 부분 수정 (User Story 2)

```bash
curl -s -X PATCH http://localhost:3000/api/tickets/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"수정된 제목"}' | jq

# description을 null로 비우기
curl -s -X PATCH http://localhost:3000/api/tickets/1 \
  -H "Content-Type: application/json" \
  -d '{"description":null}' | jq
```

**기대 결과**: 첫 요청은 title만 바뀌고 나머지 필드 유지, 두 번째 요청은
description이 `null`이 되고 title은 그대로.

## 검증 시나리오 3 — 삭제 (User Story 3)

```bash
curl -s -i -X DELETE http://localhost:3000/api/tickets/1 | head -1
# 재조회 시 404 확인
curl -s -i http://localhost:3000/api/tickets/1 | head -1
```

**기대 결과**: 삭제는 `204`, 재조회는 `404`.

## 자동화 테스트 실행

```bash
npm run test -- __tests__/api/tickets-detail.test.ts
```

TC-API-003(상세 조회), TC-API-004(수정), TC-API-006(삭제)에 대응하는 케이스가
이 파일에 구현된다 (docs/TEST_CASES.md 기준).
