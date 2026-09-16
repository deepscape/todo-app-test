# Research: 칸반 보드 조회 (GET /api/tickets)

**Feature**: [spec.md](./spec.md) | **Date**: 2026-09-15

이 기능은 기존 스택(Next.js 15 App Router, Drizzle ORM, Zod)과 기존 구현 패턴
(`POST /api/tickets`)을 그대로 따르는 조회 엔드포인트다. 기술적으로 새로 결정할
사항이 없어 각 항목은 "이미 확립된 컨벤션 재사용"으로 정리한다.

## Decision 1: 쿼리 파라미터 검증 방식

**Decision**: `GET /api/tickets`는 쿼리 파라미터를 받지 않으므로(API_SPEC.md §2)
Zod 스키마를 요청 검증에 사용하지 않는다. 대신 응답 셰이프(그룹화된 보드
데이터)의 타입 안전성은 `src/shared/types`의 `BoardData`/`TicketWithMeta`
타입으로 보장한다.

**Rationale**: constitution Principle IV(Request Validation with Zod)는 "요청
바디/쿼리 파라미터 등 시스템 경계로 들어오는 입력"을 검증 대상으로 한다. 이
엔드포인트는 입력이 없으므로 검증할 대상 자체가 없다. 검증 없는 Zod 스키마를
억지로 추가하는 것은 불필요한 추상화다.

**Alternatives considered**: 빈 쿼리 스키마(`z.object({})`)를 형식적으로
추가하는 방안을 검토했으나, 실질적 검증 로직이 없어 constitution Principle IV의
취지(외부 입력을 시스템 경계에서 검증)에 부합하지 않고 코드만 늘어나 기각.

## Decision 2: 오버듀/24시간 필터 계산 위치

**Decision**: `isOverdue` 파생과 Done 24시간 가시성 필터는 DB 쿼리가 아닌
서비스 레이어(`src/server/services/ticketService.ts`)의 애플리케이션 코드에서
계산한다.

**Rationale**: DATA_MODEL.md §5.3, §5.4에 이미 순수 함수(`isOverdue`,
`isDoneVisible`)로 정의되어 있다. "오늘"과 "현재 시각" 기준으로 매 요청마다
판정해야 하므로 저장된 컬럼이 아닌 파생 값으로 유지하는 것이 기존 설계와
일치한다. DB 레벨 필터링(WHERE 절)도 가능하지만, 인덱스(`idx_tickets_due_date`,
`idx_tickets_completed_at`)가 이미 조회 성능을 보장하므로 MVP 규모(SC-002: 1000
건)에서는 애플리케이션 레벨 필터로 충분하다.

**Alternatives considered**: SQL `WHERE` 절에서 24시간 필터를 직접 거는 방안 —
쿼리는 단순해지지만 "오버듀 판정"과 "24시간 가시성"이라는 두 개의 비즈니스
규칙이 SQL과 애플리케이션 코드에 분산되어 유지보수성이 떨어져 기각.

## Decision 3: 칼럼 그룹화 방식

**Decision**: DB에서는 `status, position` 인덱스를 활용해 정렬된 전체 티켓
목록을 한 번의 쿼리로 가져온 뒤, 서비스 레이어에서 `COLUMN_ORDER` 상수
(`src/shared/types`)를 기준으로 4개 그룹으로 나눈다.

**Rationale**: 칼럼별로 4번 쿼리하는 대신 단일 쿼리 + 애플리케이션 그룹화가
왕복 횟수를 줄인다. `idx_tickets_status_position` 인덱스가 `ORDER BY status,
position`을 이미 지원한다.

**Alternatives considered**: 칼럼별 개별 쿼리(4회) — 로직은 단순해지지만 불필요한
DB 왕복이 늘어 기각.

## Decision 4: Route Handler / Service 레이어 분리

**Decision**: `app/api/tickets/route.ts`에 기존 `POST` 핸들러와 같은 파일 내
`GET` 함수를 추가하고, 비즈니스 로직(그룹화, isOverdue, 24시간 필터)은
`src/server/services/ticketService.ts`의 새 named export 함수(`getBoard`)로
분리한다.

**Rationale**: constitution Principle V(Service Layer Separation)와 기존
`POST` 구현 패턴을 그대로 따른다. Next.js App Router 컨벤션상 같은 경로
(`/api/tickets`)의 서로 다른 HTTP 메서드는 한 `route.ts` 파일에서
`export async function GET/POST`로 공존한다.

**Alternatives considered**: 없음 — 프레임워크 컨벤션과 기존 코드 패턴을 그대로
따르는 것이 유일한 합리적 선택.

## 해결된 NEEDS CLARIFICATION

없음. Technical Context의 모든 항목이 기존 스택/구현 패턴에서 직접 도출되어
불확실한 점이 없었다.
