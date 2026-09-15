# CLAUDE.md - Tika Development Guide

> **핵심 원칙은 `.specify/memory/constitution.md` 참조**
> 이 문서는 구체적인 구현 방법과 실무 가이드를 다룬다.

## 프로젝트 개요
Tika는 티켓 기반 칸반 보드 TODO 앱이다.
Next.js App Router 기반으로, 프론트엔드와 백엔드를 디렉토리 수준에서 분리한다.
src/shared/에서 타입과 검증 스키마를 공유한다.

## 프로젝트 구조
```
tika/
├── app/api/          # 백엔드 진입점 (Route Handlers)
├── src/
│   ├── server/       # 백엔드 로직 (services, db, middleware)
│   ├── client/       # 프론트엔드 로직 (components, hooks, api)
│   └── shared/       # 공유 타입, Zod 스키마, 상수
└── docs/             # 프로젝트 명세 문서
```

## 기술 스택
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Frontend**: React 19
- **Styling**: Tailwind CSS 4
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable
- **ORM**: Drizzle ORM 0.38.x
- **DB**: PostgreSQL, `postgres`(postgres-js) 드라이버로 연결 (로컬/Vercel Postgres 공용)
- **Validation**: Zod
- **Testing**: Jest + React Testing Library
- **Deployment**: Vercel

## 환경 설정

### 환경 변수
```bash
# .env.local
POSTGRES_URL=postgres://user:password@localhost:5432/tika
```

### 경로 별칭
- `@/*` → `src/*` (tsconfig.json / jest.config.ts 공통)
  - `@/shared/...`, `@/server/...`, `@/client/...`
- `app/`은 별칭 없음 — 상대 경로로 import (예: `../../app/api/tickets/route`)

## 명세 문서 (구현 전 필수 확인)
| 문서 | 용도 |
|------|------|
| docs/PRD.md | 제품 요구사항 |
| docs/TRD.md | 기술 요구사항 |
| docs/REQUIREMENTS.md | 상세 요구사항 (FR + NFR + US) |
| docs/API_SPEC.md | API 엔드포인트 명세 |
| docs/DATA_MODEL.md | DB 스키마, ERD, 비즈니스 규칙 |
| docs/COMPONENT_SPEC.md | 컴포넌트 계층, Props, 이벤트 |
| docs/TEST_CASES.md | TDD용 테스트 케이스 정의 |

## 코딩 컨벤션

### TypeScript
```typescript
// ✅ Good
interface Ticket {
  id: number;
  title: string;
}

export const TICKET_STATUS = {
  BACKLOG: 'BACKLOG',
  TODO: 'TODO',
} as const;

type TicketStatus = typeof TICKET_STATUS[keyof typeof TICKET_STATUS];

// ❌ Bad
interface ITicket { ... }           // I 접두사 사용 금지
enum TicketStatus { ... }           // enum 대신 const 객체 사용
let data: any;                      // any 사용 금지
```

### 백엔드 (app/api/ + src/server/)

#### Route Handler 패턴
```typescript
// app/api/tickets/route.ts
import { NextResponse } from 'next/server';
import { createTicketSchema } from '@/shared/validations/ticket';
import { create } from '@/server/services/ticketService';

export async function POST(req: Request) {
  // 1. 요청 파싱
  const json = await req.json();

  // 2. Zod 검증
  const parsed = createTicketSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } },
      { status: 400 }
    );
  }

  // 3. 서비스 호출
  const ticket = await create(parsed.data);

  // 4. 응답 반환
  return NextResponse.json(ticket, { status: 201 });
}
```

#### 서비스 레이어 패턴
```typescript
// src/server/services/ticketService.ts
// 객체 메서드가 아닌 named export 함수로 작성한다.
import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { tickets } from '../db/schema';
import { TICKET_STATUS } from '@/shared/types';
import type { Ticket } from '@/shared/types';
import type { CreateTicketInput } from '@/shared/validations/ticket';

// 칼럼의 min(position) - 1024 (맨 위 배치). 칼럼이 비면 0.
async function nextBacklogPosition(): Promise<number> {
  const [{ min }] = await db
    .select({ min: sql<number | null>`min(${tickets.position})` })
    .from(tickets)
    .where(eq(tickets.status, TICKET_STATUS.BACKLOG));

  return min == null ? 0 : min - 1024;
}

export async function create(input: CreateTicketInput): Promise<Ticket> {
  const [ticket] = await db
    .insert(tickets)
    .values({
      title: input.title,
      description: input.description ?? null,
      status: TICKET_STATUS.BACKLOG,
      priority: input.priority ?? 'MEDIUM',
      position: await nextBacklogPosition(),
      plannedStartDate: input.plannedStartDate ?? null,
      dueDate: input.dueDate ?? null,
    })
    .returning();

  return ticket;
}
```

#### 에러 응답 형식
```typescript
// ✅ 올바른 에러 응답
return Response.json(
  {
    error: {
      code: 'TICKET_NOT_FOUND',
      message: '티켓을 찾을 수 없습니다'
    }
  },
  { status: 404 }
);

// ❌ 잘못된 에러 응답
return Response.json({ message: 'Not found' }, { status: 404 });
return Response.json({ error: 'Not found' }, { status: 404 });
```

### 프론트엔드 (src/client/)

#### 컴포넌트 패턴
```typescript
// src/client/components/ticket/TicketCard.tsx
import type { TicketWithMeta } from '@/shared/types';

interface TicketCardProps {
  ticket: TicketWithMeta;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export const TicketCard = ({ ticket, onEdit, onDelete }: TicketCardProps) => {
  return (
    <div className="p-4 bg-white rounded shadow">
      <h3>{ticket.title}</h3>
      {ticket.description && <p>{ticket.description}</p>}
    </div>
  );
};
```

#### API 호출 패턴
```typescript
// src/client/api/ticketApi.ts
import type { CreateTicketInput, Ticket } from '@/shared/types';

export const ticketApi = {
  async create(input: CreateTicketInput): Promise<Ticket> {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message ?? 'Unknown error');
    }

    return res.json();
  },
};

// 컴포넌트에서 사용
import { ticketApi } from '@/client/api/ticketApi';

const handleCreate = async (data: CreateTicketInput) => {
  try {
    const ticket = await ticketApi.create(data);
    // ...
  } catch (error) {
    console.error(error);
  }
};
```

## SDD 워크플로우

### 1. 구현 전 명세 확인
```
API 구현 → API_SPEC.md 확인
컴포넌트 → COMPONENT_SPEC.md 확인
DB 작업 → DATA_MODEL.md 확인
타입 정의 → src/shared/types 확인
```

### 2. TDD 사이클
```
1. TEST_CASES.md에서 테스트 케이스 확인
2. 테스트 코드 작성 (Red) - 실패하는 테스트
3. 최소 구현 (Green) - 테스트 통과
4. 리팩토링 (Refactor) - 코드 개선
5. 명세 일치 확인
```

### 3. 구현 순서
```
1. src/shared/types - 타입 정의
2. src/shared/validations - Zod 스키마
3. __tests__/ - 테스트 코드
4. src/server/services/ - 비즈니스 로직
5. app/api/ - Route Handler
6. src/client/api/ - API 호출 함수
7. src/client/components/ - UI 컴포넌트
```

## 개발 명령어

### 일반 개발
```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 실행
npm run lint         # ESLint 실행
```

### 테스트
```bash
npm run test         # 테스트 실행
npm run test:watch   # watch 모드
npx tsc --noEmit     # 타입 체크
```

### 데이터베이스
```bash
npm run db:generate  # 마이그레이션 생성
npm run db:migrate   # 마이그레이션 실행 (POSTGRES_URL을 인라인으로 넘겨야 함 — 아래 참고)
npm run db:studio    # Drizzle Studio 실행
npm run db:seed      # 개발용 시드 데이터 삽입 (POSTGRES_URL 인라인 필요, 아래 참고)
```

> `drizzle-kit`은 `.env.local`을 자동으로 읽지 않는다. `db:migrate`/`db:studio`
> 실행 시 `POSTGRES_URL='postgres://...' npm run db:migrate`처럼 인라인으로
> 넘기거나 셸에 미리 export해야 한다 (`db:generate`는 DB 접속이 필요 없어 예외).
> `db:seed`(`ts-node`로 직접 실행)도 마찬가지로 `.env.local`을 자동 로드하지
> 않으므로 동일하게 인라인으로 넘겨야 한다.
> `src/server/db/seed.ts`는 실행 시점 기준 상대 날짜로 티켓 9건(각 칼럼에
> 분산, isOverdue/Done 24시간 노출 케이스 포함)을 생성하며, 실행할 때마다
> 기존 데이터를 전부 지우고 새로 삽입한다.

## 검증 체크리스트

### 커밋 전
- [ ] `npx tsc --noEmit` 타입 체크 통과
- [ ] `npm run test` 모든 테스트 통과
- [ ] `npm run build` 빌드 성공
- [ ] console.log 제거 확인
- [ ] .env 파일 미포함 확인

### PR 전
- [ ] 명세 문서와 일치 확인
- [ ] 테스트 커버리지 충분
- [ ] 레이어 분리 준수 (Route Handler vs Service)
- [ ] Zod 검증 누락 없음
- [ ] 에러 응답 형식 일치

## 금지 사항

### 절대 하지 말 것
- ❌ any 타입 사용
- ❌ 명세 없는 기능 추가
- ❌ 테스트 삭제 또는 `.skip()`
- ❌ console.log 커밋
- ❌ .env 파일 커밋
- ❌ src/client/에서 DB 직접 접근
- ❌ Route Handler에 비즈니스 로직 작성

### 확인 필요
- ⚠️ DB 스키마 변경 → 마이그레이션 생성
- ⚠️ shared 타입 변경 → 영향 범위 확인
- ⚠️ API 응답 형식 변경 → API_SPEC.md 먼저 수정
- ⚠️ 패키지 추가/업그레이드 → 호환성 확인

## 문제 해결

### 타입 에러
```bash
# 타입 체크
npx tsc --noEmit

# 캐시 삭제 후 재시도
rm -rf .next
npm run build
```

### 테스트 실패
```bash
# 단일 테스트 실행
npm run test -- path/to/test.test.ts

# 상세 로그
npm run test -- --verbose
```

### DB 연결 오류
```bash
# 환경 변수 확인
echo $POSTGRES_URL

# DB 상태 확인
psql $POSTGRES_URL -c "SELECT 1"
```

## Git 워크플로우

### 커밋 메시지
```bash
feat: 티켓 생성 API 구현
fix: 티켓 삭제 시 404 에러 수정
refactor: ticketService 로직 분리
test: 티켓 목록 조회 테스트 추가
docs: API_SPEC.md 에러 코드 추가
```

### 브랜치 전략
- `main`: 프로덕션
- `feat/*`: 기능 구현 (예: `feat/tc-api-001-green`)
- `test/*`: TDD Red 단계 (예: `test/tc-api-001-red`)
- `refactor/*`: 리팩터링
- `chore/*`: 설정/문서/스캐폴딩 정비
- `fix/*`: 버그 수정

---

**핵심 원칙과 거버넌스는 `.specify/memory/constitution.md` 참조**
