# Quickstart: 티켓 순서/상태 변경 (reorder)

**Feature**: [spec.md](./spec.md) | **Contract**: [contracts/ticket-reorder.md](./contracts/ticket-reorder.md)

## 사전 준비

```bash
npm install
POSTGRES_URL='postgres://...' npm run db:migrate
npm run dev
```

## 검증 시나리오 1 — 칼럼 간 이동 + startedAt 자동 기록

```bash
CREATE=$(curl -s -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" -d '{"title":"reorder 검증용"}')
# id 확인 후 <id>에 대입

curl -s -X PATCH http://localhost:3000/api/tickets/reorder \
  -H "Content-Type: application/json" \
  -d '{"ticketId": <id>, "status": "TODO", "position": 0}' | jq
```

**기대 결과**: `status: "TODO"`, `startedAt`이 현재 시각으로 설정됨.

## 검증 시나리오 2 — TODO에서 BACKLOG로 되돌리기

```bash
curl -s -X PATCH http://localhost:3000/api/tickets/reorder \
  -H "Content-Type: application/json" \
  -d '{"ticketId": <id>, "status": "BACKLOG", "position": 0}' | jq
```

**기대 결과**: `status: "BACKLOG"`, `startedAt: null`.

## 검증 시나리오 3 — 같은 칼럼 내 순서 재배치 + affected

```bash
# 같은 칼럼에 티켓 3개를 만든 뒤, 마지막 티켓을 맨 앞으로 이동
curl -s -X PATCH http://localhost:3000/api/tickets/reorder \
  -H "Content-Type: application/json" \
  -d '{"ticketId": <id3>, "status": "BACKLOG", "position": 0}' | jq
```

**기대 결과**: `ticket.position`이 기존 최솟값보다 작아짐, 필요 시
`affected` 배열에 재정렬된 다른 티켓들이 포함됨.

## 검증 시나리오 4 — DONE 요청 거부 / 없는 티켓

```bash
curl -s -i -X PATCH http://localhost:3000/api/tickets/reorder \
  -H "Content-Type: application/json" \
  -d '{"ticketId": <id>, "status": "DONE", "position": 0}' | head -1
# 기대: 400

curl -s -i -X PATCH http://localhost:3000/api/tickets/reorder \
  -H "Content-Type: application/json" \
  -d '{"ticketId": 999999, "status": "TODO", "position": 0}' | head -1
# 기대: 404
```

## 자동화 테스트 실행

```bash
npm run test -- __tests__/api/tickets-reorder.test.ts
```

TC-API-007(007-1~007-12)에 대응하는 케이스가 이 파일에 구현된다.
