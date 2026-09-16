# Research: 티켓 순서/상태 변경 (reorder)

**Feature**: [spec.md](./spec.md) | **Date**: 2026-09-15

이 기능은 3개 엔드포인트 중 가장 복잡한 비즈니스 로직(원자적 상태/순서
변경, position 재계산, 파생 필드 관리)을 가진다.

## Decision 1: 요청 `position` 필드의 의미 — 배열 인덱스

**Decision**: 요청 바디의 `position`은 DB에 저장된 정수 position 값이
아니라, "이동 후 그 칼럼 안에서 몇 번째(0-based 인덱스) 자리에 놓이는가"를
나타내는 **배열 인덱스**로 해석한다. 서버는 대상 칼럼을 position
오름차순으로 조회한 뒤(이동할 티켓 자신은 제외), 그 인덱스의 앞/뒤 티켓의
실제 DB position 값을 가져와 `(prev + next) / 2`를 계산한다.

**Rationale**: API_SPEC.md §7 예시 요청은 `"position": 0`(정수 인덱스로
보임)인데, 응답 `affected`의 `position`은 `1024`, `2048`처럼 큰 간격
정수 값이다. 두 값의 스케일이 다르다는 것은 요청의 `position`이 저장값
그 자체가 아니라 UI가 계산하기 쉬운 "삽입하려는 순서상의 자리"라는
의미다. "두 카드 사이에 삽입할 때: (prev + next) / 2" 규칙(API_SPEC.md
§7, docs/REQUIREMENTS.md §FR-007)도 인덱스 기반 해석과 정확히 들어맞는다
— 프론트엔드(@dnd-kit)가 드롭된 자리의 배열 인덱스를 그대로 보내면
되므로 UI 구현이 단순해진다.

**Alternatives considered**: 요청의 `position`을 저장값 그대로 사용
(그 값 좌우의 기존 레코드를 찾아 중간값 계산) — 클라이언트가 서버 내부
저장 스케일(1024 간격)을 알아야 하므로 프론트엔드/백엔드 결합도가
높아져 기각. 이 프로젝트가 아직 프론트엔드 보드 UI를 구현하지 않은
시점이라 단정할 근거가 부족하지만, API_SPEC.md의 표기(작은 정수 `0`)와
FR-007의 "두 카드 사이" 서술이 인덱스 해석과 일치하므로 이 방식을
채택한다.

## Decision 2: position 재계산 알고리즘

**Decision**: 대상 칼럼(이동할 티켓 제외)을 position 오름차순으로 조회한
배열을 `columnTickets`라 할 때:
- `columnTickets[index - 1]`을 `prev`, `columnTickets[index]`를 `next`로
  둔다 (인덱스 `0`이면 `prev = null`, 배열 끝이면 `next = null`).
- `prev`도 `next`도 없으면(빈 칼럼) position = `0`.
- `prev`만 없으면(맨 앞) position = `next.position - 1024`.
- `next`만 없으면(맨 뒤) position = `prev.position + 1024`.
- 둘 다 있으면 position = `(prev.position + next.position) / 2`. 이
  값이 `prev.position`과의 차이 또는 `next.position`과의 차이가 1 미만
  이면(간격 부족) 해당 칼럼 전체를 0, 1024, 2048...로 재정렬한 뒤 다시
  계산한다.

**Rationale**: API_SPEC.md §7 "position 재계산 로직"을 그대로 알고리즘화한
것이다. 재정렬(rebalance)이 필요한 경우를 "간격이 1 미만"으로 명확히
정의해 무한 소수화(계속 반으로 쪼개다 부동소수점 정밀도 문제 발생)를
방지한다.

**Alternatives considered**: 항상 정수 position만 쓰고 재정렬을 매번
수행 — 매 이동마다 칼럼 전체를 갱신해야 해 `affected` 배열이 항상
커지므로 비효율적. 명세가 요구하는 "간격 부족 시에만 재정렬"이 맞다.

## Decision 3: 트랜잭션 범위

**Decision**: `db.transaction()` 내부에서 (1) 대상 티켓 조회+락 성격의
재조회, (2) 대상 칼럼의 재정렬이 필요하면 그 UPDATE들, (3) 대상 티켓의
status/position/startedAt/completedAt UPDATE를 모두 수행한다. 트랜잭션
밖에서는 응답 조립만 한다.

**Rationale**: spec.md FR-009("상태와 순서 변경을 하나의 단위로 처리")와
API_SPEC.md "전체 작업을 트랜잭션으로 처리"를 그대로 반영한다. Drizzle의
`db.transaction(async (tx) => {...})` API를 사용하며, 이 프로젝트의
DB 클라이언트(`postgres-js`)가 트랜잭션을 지원한다.

**Alternatives considered**: 재정렬과 최종 이동을 별도 트랜잭션으로
분리 — 재정렬 커밋 후 이동이 실패하면 칼럼은 재정렬됐지만 이동은
안 된 중간 상태가 남을 수 있어 FR-009 위반. 기각.

## Decision 4: startedAt/completedAt 파생 규칙 구현 위치

**Decision**: 서비스 함수 내에서 "이전 상태(from)"와 "새 상태(to)"를
비교해 규칙을 적용한다:
- `to === TODO && from !== TODO` → `startedAt = now`
- `to === BACKLOG` → `startedAt = null` (출발 칼럼 무관 — 아래 근거 참고)
- 그 외 → `startedAt` 필드를 UPDATE에 포함하지 않음(기존 값 유지)
- `from === DONE` → `completedAt = null` (to는 DONE이 될 수 없으므로
  항상 이 조건이면 "DONE에서 나가는" 이동)

**Rationale**: spec.md FR-003~FR-006, API_SPEC.md/REQUIREMENTS.md
"비즈니스 로직" 섹션, docs/TEST_CASES.md TC-API-007을 종합한 결과다.
`docs/DATA_MODEL.md` §5.1은 "TODO에서 BACKLOG로 이동 시만
startedAt=null"이라 명시하지만, `docs/TEST_CASES.md` 007-6("Done에서
BACKLOG로 이동" → `startedAt = null` 기대)과 직접 상충한다. 사용자
확인 결과 "도착 칼럼이 BACKLOG면 출발 칼럼과 무관하게 항상 null"로
규칙을 확정했다 — "BACKLOG는 아직 시작하지 않은 상태"라는 더 넓은
불변식으로 DATA_MODEL.md의 규칙을 포함하는 상위 규칙이다. 이 결정으로
007-4(TODO→BACKLOG)와 007-6(DONE→BACKLOG) 모두 자연스럽게 통과한다.

**Alternatives considered**: DATA_MODEL.md 엄격 준수(TODO→BACKLOG만
null) — 이 경우 007-6 테스트가 실패해 TEST_CASES.md와 불일치가 남아
기각.

## Decision 5: DONE 상태를 요청하면 거부

**Decision**: Zod 스키마에서 `status`를 `z.enum(['BACKLOG', 'TODO',
'IN_PROGRESS'])`로 제한해 `DONE`을 요청하면 자동으로
`400 VALIDATION_ERROR`("상태는 BACKLOG, TODO, IN_PROGRESS 중
선택해주세요")가 발생하도록 한다.

**Rationale**: API_SPEC.md §7 "주의: status에 DONE은 허용하지 않는다"를
Zod 열거형 자체로 강제하는 것이 별도 조건 분기보다 단순하고
constitution Principle IV(Zod 검증)에 부합한다.

**Alternatives considered**: `TicketStatus` 전체를 받고 서비스 레이어에서
DONE이면 에러를 던지는 방식 — Zod가 이미 이 역할을 정확히 할 수 있어
불필요한 중복.

## 해결된 NEEDS CLARIFICATION

없음. Decision 1(요청 position의 의미)은 명세 문서의 예시값과 서술을
근거로 확정했다.
