# Quickstart: 티켓 완료 처리

**Feature**: [spec.md](./spec.md) | **Contract**: [contracts/ticket-complete.md](./contracts/ticket-complete.md)

## 사전 준비

```bash
npm install
POSTGRES_URL='postgres://...' npm run db:migrate
npm run dev
```

## 검증 시나리오 1 — 완료 처리 (User Story 1)

```bash
# 티켓 생성
CREATE=$(curl -s -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" -d '{"title":"완료 처리 검증용"}')
echo "$CREATE"

# id로 완료 처리 (본문 없음)
curl -s -X PATCH http://localhost:3000/api/tickets/<id>/complete | jq
```

**기대 결과**: `status: "DONE"`, `completedAt`이 현재 시각 근처로 설정됨.

## 검증 시나리오 2 — 완료 칼럼 맨 위 배치 (User Story 2)

```bash
# 티켓 2개를 완료 처리한 뒤 보드 조회
curl -s -X PATCH http://localhost:3000/api/tickets/<id1>/complete
curl -s -X PATCH http://localhost:3000/api/tickets/<id2>/complete
curl -s http://localhost:3000/api/tickets | jq '.board.DONE'
```

**기대 결과**: 나중에 완료 처리한 `id2`가 `DONE` 배열의 맨 앞에 나타남.

## 검증 시나리오 3 — 없는 티켓 완료 처리

```bash
curl -s -i -X PATCH http://localhost:3000/api/tickets/999999/complete | head -1
```

**기대 결과**: `404`.

## 자동화 테스트 실행

```bash
npm run test -- __tests__/api/tickets-complete.test.ts
```

TC-API-005(005-1~005-5)에 대응하는 케이스가 이 파일에 구현된다.
