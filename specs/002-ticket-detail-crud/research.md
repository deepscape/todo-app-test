# Research: 티켓 상세 조회/수정/삭제

**Feature**: [spec.md](./spec.md) | **Date**: 2026-09-15

이 기능은 기존 스택과 `POST`/`GET /api/tickets` 구현 패턴을 그대로 따르는
단일 리소스 CRUD 엔드포인트 3개(GET/PATCH/DELETE `/api/tickets/:id`)다.

## Decision 1: 경로 파라미터(id) 검증 방식

**Decision**: `id`는 Zod 스키마가 아닌, Route Handler에서 `Number(params.id)`
후 `Number.isInteger` + 양수 체크로 검증한다. 실패 시 즉시 `TICKET_NOT_FOUND`
로 취급하지 않고 별도 `VALIDATION_ERROR`로 응답한다 (docs/TEST_CASES.md
003-3: 잘못된 id 형식 → 400 VALIDATION_ERROR).

**Rationale**: API_SPEC.md는 `id`를 path parameter(`number`)로 정의하며,
숫자가 아닌 id(`"abc"`)는 리소스 부재(404)가 아니라 요청 자체가 잘못된
것(400)으로 문서화되어 있다 (TC-API-003 003-3). Zod는 요청 바디/쿼리용으로
쓰고 있으므로(constitution Principle IV), path parameter는 그 경계 밖이지만
"시스템 경계로 들어오는 입력"이라는 원칙의 취지상 검증은 동일하게 필요해
Route Handler에서 간단한 타입 가드로 처리한다.

**Alternatives considered**: path parameter도 Zod로 감싸는 방안 — 값 하나에
스키마를 도입하는 오버엔지니어링이라 판단해 기각. 검증 없이 바로 DB 쿼리에
전달하는 방안 — `NaN`이 쿼리에 들어가 예기치 않은 동작(500)을 유발할 수 있어
기각.

## Decision 2: PATCH의 "필드 삭제"(null) 처리 방식

**Decision**: `UpdateTicketInput`의 `description`, `plannedStartDate`,
`dueDate`는 `string | null | undefined`로 정의한다. 필드가 요청 바디에
아예 없으면(`undefined`) 기존 값 유지, `null`이면 명시적으로 비움
(API_SPEC.md §4 Request Body: "null이면 삭제").

**Rationale**: PATCH의 부분 업데이트 의미론상 "필드 없음"과 "필드를 null로
설정"은 구분되어야 한다. Zod의 `.nullable().optional()` 조합이 정확히 이
두 상태를 구분해 표현한다(API_SPEC.md §457 updateTicketSchema에 이미 정의된
패턴).

**Alternatives considered**: 없음 — API_SPEC.md가 이미 정확한 스키마를
제공하므로 그대로 채택.

## Decision 3: 404 판정 공통화

**Decision**: `ticketService.ts`에 티켓 조회 실패 시 공통으로 던질 수 있는
`TicketNotFoundError` 같은 별도 에러 클래스를 만들지 않고, 각 서비스 함수가
조회 결과가 없으면 `null`을 반환하며 Route Handler가 이를 404 응답으로
변환한다.

**Rationale**: 기존 `create()` 함수가 예외를 던지지 않는 단순한 반환값
패턴을 쓰고 있어(constitution Principle V의 "얇은 Route Handler"와 결합),
같은 패턴을 유지하는 것이 일관적이다. 커스텀 에러 클래스는 이 프로젝트
규모(단일 엔티티, 소수 엔드포인트)에서 불필요한 추상화다.

**Alternatives considered**: 예외 기반(`throw new TicketNotFoundError()`) +
전역 에러 핸들러 — `src/server/middleware/errorHandler.ts`가 이미 스캐폴딩
되어 있지만 현재 프로젝트에서 실제로 쓰이는 패턴이 아니며, 도입 시 기존
`POST`/`GET` 핸들러와 스타일이 달라져 기각.

## Decision 4: DELETE 응답

**Decision**: 성공 시 `204 No Content`, 본문 없음 (`NextResponse.json`
대신 `new NextResponse(null, { status: 204 })`).

**Rationale**: API_SPEC.md §6 "Response 204 No Content: 본문 없음"과
정확히 일치. Next.js Route Handler는 `NextResponse.json(null)`을 쓰면
`"null"` 바디가 생기므로 본문 없는 응답을 위해 별도 처리가 필요하다.

**Alternatives considered**: 없음 — 명세가 명확하다.

## 해결된 NEEDS CLARIFICATION

없음. 모든 항목이 API_SPEC.md §3/§4/§6과 기존 구현 패턴에서 직접 도출되었다.
