# Research: 티켓 완료 처리

**Feature**: [spec.md](./spec.md) | **Date**: 2026-09-15

이 기능은 기존 스택/패턴을 따르는 상태 전이 엔드포인트
(`PATCH /api/tickets/:id/complete`) 하나다.

## Decision 1: position 계산 재사용

**Decision**: `create()`가 쓰는 "해당 칼럼의 `min(position) - 1024`" 로직을
일반화하여 `nextTopPosition(status)` 헬퍼로 추출하고, `create()`(BACKLOG
전용)와 새 `complete()`(DONE 전용) 양쪽에서 재사용한다.

**Rationale**: docs/DATA_MODEL.md §5.5 "Position 관리"는 "새 티켓 생성
시"뿐 아니라 완료 처리 시에도 동일한 "맨 위 배치" 규칙(`min(position) -
1024`, 칼럼이 비면 0)을 명시한다 (API_SPEC.md §5 처리 규칙: "position은
Done 칼럼의 min(position) - 1024"). 기존 `nextBacklogPosition()`은
이름과 구현이 BACKLOG에 고정되어 있어, 상태를 매개변수로 받는 형태로
일반화하는 것이 중복을 피하는 가장 단순한 방법이다.

**Alternatives considered**: `complete()` 전용으로 별도 함수를 새로 작성 —
`nextBacklogPosition()`과 로직이 100% 동일(쿼리 조건의 status 값만 다름)해
중복 코드가 생겨 기각.

## Decision 2: 요청 바디 없음 → Zod 불필요

**Decision**: API_SPEC.md §5 "Request Body: 없음"이므로 이 엔드포인트는
Zod 스키마를 정의하지 않는다 (001-board-view의 GET과 동일한 근거).

**Rationale**: constitution Principle IV는 시스템 경계로 들어오는 입력을
검증 대상으로 한다. 입력이 없으면 검증할 것도 없다.

**Alternatives considered**: 없음.

## Decision 3: 이미 DONE인 티켓 재완료 처리

**Decision**: 상태 전이 이전 값과 무관하게 항상 동작한다 — 이미 DONE인
티켓을 다시 완료 처리해도 오류 없이 `completedAt`과 `position`이 갱신된다
(spec.md Edge Cases).

**Rationale**: API_SPEC.md는 "이전 상태가 DONE이 아니어야 한다"는 전제
조건을 두지 않는다. 멱등적으로 동작하게 하는 편이 클라이언트 구현을
단순화한다 (재시도 시 오류가 나지 않음).

**Alternatives considered**: 이미 DONE이면 409 Conflict 반환 — API_SPEC.md
에 정의되지 않은 에러 코드를 새로 도입해야 하고 사용자 시나리오상 실익이
없어 기각.

## 해결된 NEEDS CLARIFICATION

없음. API_SPEC.md §5, docs/DATA_MODEL.md §5.2/§5.5에서 모든 규칙이
명확히 도출된다.
