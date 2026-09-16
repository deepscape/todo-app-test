<!--
Sync Impact Report
==================
Version change: 1.0.0 → 2.0.0
Rationale: User explicitly supplied a new, complete set of 5 principles to
replace the existing ones. All prior Core Principles (Layered Separation,
Spec-Driven Implementation, Test-First Development, Type Safety & Validation,
Consistent API Contract) are removed/redefined and replaced — a backward
incompatible governance change — hence MAJOR bump.

Modified principles (old → new):
  - I. Layered Separation (NON-NEGOTIABLE) → V. Service Layer Separation
    (narrowed to the src/server/services/ requirement the user specified)
  - II. Spec-Driven Implementation → II. API Contract Fidelity
    (narrowed to API_SPEC.md conformance)
  - III. Test-First Development (NON-NEGOTIABLE) → removed
  - IV. Type Safety & Validation (NON-NEGOTIABLE) → split into
    I. TypeScript Strict Mode + IV. Request Validation with Zod
  - V. Consistent API Contract → III. Error Response Format
    (narrowed to the { error: { code, message } } shape)

Added sections: none (Technology Stack & Constraints and Development
Workflow & Quality Gates sections retained from v1.0.0 with no changes)

Removed sections:
  - Standalone Test-First Development principle (no longer a named Core
    Principle; TDD workflow guidance remains in Development Workflow &
    Quality Gates and in CLAUDE.md, but is no longer NON-NEGOTIABLE at the
    constitution level per explicit user replacement instruction)

Deferred / TODO items:
  - User wrote "msg" for the error field name in their instruction; clarified
    with the user that CLAUDE.md and all existing route handlers use
    "message" — user confirmed keeping "message". No TODO left.
  - User confirmed full replacement (not merge) of the five principles.

Templates requiring follow-up review (not modified by this command):
  - .specify/templates/plan-template.md — Constitution Check gates should be
    re-verified against the new principle names (I–V changed)
  - .specify/templates/tasks-template.md — previously referenced Test-First
    as a NON-NEGOTIABLE Core Principle; TDD is still the mandated workflow
    (see Development Workflow & Quality Gates) but is no longer a numbered
    Core Principle — verify task ordering guidance still makes sense
  - CLAUDE.md — content is still consistent with the new principles; no
    edits made (out of scope for this command)
-->

# Tika Constitution

## Core Principles

### I. TypeScript Strict Mode
모든 코드는 TypeScript strict 모드에서 작성한다. `any` 타입을 사용하지 않는다.
`tsconfig.json`의 strict 옵션을 완화하지 않는다. 커밋 전 `npx tsc --noEmit`이
오류 없이 통과해야 한다.
**Rationale**: strict 모드와 `any` 금지는 컴파일 타임에 오류를 최대한 포착해
런타임 장애를 예방하기 위한 이 프로젝트의 핵심 기술 선택이다.

### II. API Contract Fidelity
모든 API 엔드포인트의 요청/응답 형식은 `docs/API_SPEC.md`에 정의된 그대로
정확히 따른다. 엔드포인트 경로, HTTP 메서드, 상태 코드, 응답 바디 구조 중
하나라도 명세와 다르게 구현하지 않는다. 구현 중 응답 형식을 바꿔야 할 필요가
생기면 코드보다 `docs/API_SPEC.md`를 먼저 수정한다.
**Rationale**: 프론트엔드(`src/client/api/`)와 백엔드가 API_SPEC.md를 유일한
진실 공급원으로 신뢰하고 독립적으로 개발되므로, 명세와의 불일치는 통합 시점에야
발견되는 결함을 만든다.

### III. Error Response Format
모든 API 에러 응답은 `{ error: { code, message } }` 형식을 따른다. 평문
문자열 응답, `{ message }` 단독 형식, 필드명이 다른 형식(`msg` 등)은
허용하지 않는다. `code`는 `TICKET_NOT_FOUND`와 같이 상수적인 에러 코드,
`message`는 사용자에게 보여줄 수 있는 설명이다.
**Rationale**: 프론트엔드 에러 처리 로직이 이 형식을 고정 가정으로 작성되므로,
형식이 엔드포인트마다 달라지면 클라이언트 쪽 에러 처리가 깨진다.

### IV. Request Validation with Zod
모든 API 요청(바디, 쿼리 파라미터 등 시스템 경계로 들어오는 입력)은 Zod
스키마로 검증한다. 검증 없이 요청 데이터를 직접 서비스 레이어에 전달하지
않는다. 검증 스키마는 `src/shared/validations/`에 정의하여 프론트엔드와
백엔드가 동일한 스키마를 공유한다. 검증 실패 시 `VALIDATION_ERROR` 코드로
[Principle III](#iii-error-response-format)의 에러 형식에 맞춰 응답한다.
**Rationale**: 외부 입력을 신뢰하지 않고 시스템 경계에서 검증하는 것은 잘못된
데이터가 비즈니스 로직이나 DB까지 도달하는 것을 막는 최소한의 안전장치다.

### V. Service Layer Separation
비즈니스 로직은 반드시 `src/server/services/`에 분리하여 작성한다. Route
Handler(`app/api/`)는 요청 파싱, Zod 검증 호출, 서비스 함수 호출, 응답 반환만
담당하며 비즈니스 로직(조건 분기, 계산, 여러 단계의 DB 조작 조합 등)을
직접 포함하지 않는다. 서비스 레이어는 객체 메서드가 아닌 named export 함수로
작성한다.
**Rationale**: Route Handler에 로직이 섞이면 테스트하기 어렵고 재사용이
불가능해진다. 로직을 서비스 함수로 분리하면 Route Handler 없이 단위 테스트가
가능하고, 여러 엔드포인트가 동일 로직을 재사용할 수 있다.

## Technology Stack & Constraints

- **Framework**: Next.js 15 (App Router), React 19, TypeScript strict mode.
- **Styling**: Tailwind CSS 4.
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable.
- **ORM/DB**: Drizzle ORM 0.38.x, `postgres`(postgres-js) 드라이버, PostgreSQL
  (로컬 및 Vercel Postgres/Neon 공용).
- **Validation**: Zod — `src/shared/validations/`에 정의하고 프론트/백엔드가
  공유한다.
- **Testing**: Jest + React Testing Library.
- **Deployment**: Vercel (단일 플랫폼에 프론트엔드·API·DB 통합 운영).
- **경로 별칭**: `@/*` → `src/*`. `app/`은 별칭 없이 상대 경로로 import한다.
- 패키지 추가/업그레이드 시 기존 스택(Drizzle, Next 15, React 19)과의 호환성을
  먼저 확인한다.
- DB 스키마를 변경하면 반드시 마이그레이션을 생성한다 (`npm run db:generate`).

## Development Workflow & Quality Gates

구현 순서는 다음을 따른다: `src/shared/types` → `src/shared/validations` →
`__tests__/`(Red) → `src/server/services/`(Green) → `app/api/` →
`src/client/api/` → `src/client/components/`. `docs/TEST_CASES.md`의 테스트
케이스를 기준으로 Red-Green-Refactor 사이클을 따르며, 기존 테스트를 삭제하거나
`.skip()`으로 비활성화하지 않는다.

**커밋 전 체크리스트**:
- `npx tsc --noEmit` 타입 체크 통과 ([Principle I](#i-typescript-strict-mode))
- `npm run test` 모든 테스트 통과
- `npm run build` 빌드 성공
- `console.log` 미포함
- `.env` 파일 미포함

**PR 전 체크리스트**:
- 명세 문서(`docs/API_SPEC.md` 등)와 구현 일치 ([Principle II](#ii-api-contract-fidelity))
- 테스트 커버리지 충분
- 레이어 분리 준수 (Route Handler vs Service, [Principle V](#v-service-layer-separation))
- Zod 검증 누락 없음 ([Principle IV](#iv-request-validation-with-zod))
- 에러 응답 형식 일치 ([Principle III](#iii-error-response-format))

브랜치 전략: `main`(프로덕션), `feat/*`(기능 구현), `test/*`(TDD Red 단계),
`refactor/*`, `chore/*`, `fix/*`. 커밋 메시지는 Conventional Commits 스타일
(`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`)을 따른다.

## Governance

이 헌법은 `CLAUDE.md`를 비롯한 다른 모든 개발 가이드보다 우선한다. `CLAUDE.md`는
이 헌법에 명시된 원칙의 구체적 구현 방법을 다루는 실무 가이드이며, 두 문서가
충돌하면 이 헌법이 우선한다.

**개정 절차**: 원칙 추가·삭제·재정의는 이 문서를 직접 수정하고, 상단에 Sync
Impact Report를 기록한 뒤 커밋한다. 개정 시 버전을 다음 규칙에 따라 올린다:
- **MAJOR**: 기존 원칙의 하위 호환 불가능한 제거 또는 재정의
- **MINOR**: 새 원칙 추가 또는 기존 원칙의 실질적 확장
- **PATCH**: 표현 수정, 오탈자 수정 등 비의미적 개선

**준수 검토**: 모든 PR은 위 "PR 전 체크리스트"를 통해 이 헌법 준수 여부를
확인해야 한다. 원칙을 위반하는 복잡성이나 예외는 PR 설명에 명시적으로
정당화되어야 한다. 일상적인 구현 가이드(코드 예시, 명령어 등)는 `CLAUDE.md`를
참조한다.

**Version**: 2.0.0 | **Ratified**: 2026-09-10 | **Last Amended**: 2026-09-15
