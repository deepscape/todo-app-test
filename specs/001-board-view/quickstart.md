# Quickstart: 칸반 보드 조회 (GET /api/tickets)

**Feature**: [spec.md](./spec.md) | **Contract**: [contracts/get-tickets.md](./contracts/get-tickets.md)

이 기능이 동작함을 확인하는 최소 검증 절차다. 구현 세부 코드는 포함하지 않는다.

## 사전 준비

```bash
# .env.local에 POSTGRES_URL 설정되어 있어야 함 (CLAUDE.md 참조)
npm install
POSTGRES_URL='postgres://...' npm run db:migrate
npm run dev
```

## 검증 시나리오 1 — 빈 보드 (FR-005)

```bash
curl -s http://localhost:3000/api/tickets | jq
```

**기대 결과**: `200 OK`, `board`의 4개 키 모두 존재하며 각각 `[]`,
`total: 0`.

## 검증 시나리오 2 — 상태별 그룹화 및 정렬 (User Story 1, 2)

1. `POST /api/tickets`로 티켓 2개 이상 생성 (기본 status는 BACKLOG)
2. `PATCH /api/tickets/reorder`로 일부를 TODO/IN_PROGRESS로 이동
3. 아래 요청으로 보드 조회

```bash
curl -s http://localhost:3000/api/tickets | jq '.board'
```

**기대 결과**: 각 티켓이 이동시킨 상태의 칼럼에 나타나고, 같은 칼럼 내에서는
생성/이동 순서(position 오름차순)대로 정렬되어 있다.

## 검증 시나리오 3 — 기한 초과 표시 (User Story 3, FR-003)

1. `dueDate`를 어제 날짜로 하여 티켓 생성 (직접 DB에서 seed하거나, 생성 후
   PATCH로 과거 날짜를 넣을 수 없다면 시드 데이터 활용 — API_SPEC.md는 생성
   시 과거 dueDate를 거부하므로 테스트 데이터는 시드/DB 직접 삽입으로 준비)
2. 보드 조회

```bash
curl -s http://localhost:3000/api/tickets | jq '.board.BACKLOG[] | {id, dueDate, isOverdue}'
```

**기대 결과**: 해당 티켓의 `isOverdue`가 `true`.

## 검증 시나리오 4 — Done 24시간 필터 (User Story 3, FR-004)

1. `completedAt`이 25시간 전인 DONE 티켓과, 방금 완료 처리한 DONE 티켓을
   각각 준비 (`PATCH /api/tickets/:id/complete`로 방금 완료된 건 생성 가능;
   25시간 전 건은 시드 데이터 활용)
2. 보드 조회

```bash
curl -s http://localhost:3000/api/tickets | jq '.board.DONE'
```

**기대 결과**: 방금 완료한 티켓만 `DONE` 배열에 나타나고, 25시간 전에 완료된
티켓은 나타나지 않는다.

## 자동화 테스트 실행

```bash
npm run test -- __tests__/api/tickets.test.ts
```

이 기능 구현 시 `__tests__/api/tickets.test.ts`(또는 별도 GET 전용 테스트
파일)에 위 4개 시나리오에 대응하는 케이스가 추가되어야 한다
(docs/TEST_CASES.md 기준 TC-API-002 예상).
