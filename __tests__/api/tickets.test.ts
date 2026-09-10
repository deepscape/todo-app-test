/**
 * @jest-environment node
 */

/**
 * TC-API-001: POST /api/tickets — 티켓 생성 (TDD Red)
 *
 * 관련 FR: FR-001 / 관련 US: US-001, US-002
 * 스펙: docs/API_SPEC.md §1, §457 (Zod), §12 (에러 형식)
 *       docs/REQUIREMENTS.md §FR-001
 *       docs/TEST_CASES.md TC-API-001
 *
 * 이 시점에는 다음이 아직 구현되지 않았으므로 모든 테스트가 실패해야 한다:
 *   - app/api/tickets/route.ts  (POST 핸들러)
 *   - src/server/db/index.ts    (postgres-js Drizzle 클라이언트)
 *   - src/shared/validations/ticket.ts
 *   - src/server/services/ticketService.ts
 *
 * 실제 tika_test DB 를 사용하는 통합 테스트다 (next/jest 가 .env.test 자동 로드).
 * 각 테스트 전에 tickets 테이블을 TRUNCATE 하여 격리한다.
 */

import { truncateTickets, closeDb } from './helpers/db';

// app/api/tickets/route.ts 는 아직 미구현 (TDD Red).
// 파일 최상단에서 import 하면 스위트 전체가 로드 전 죽으므로,
// 요청 시점에 동적 import 하여 각 테스트가 개별적으로 실패하게 한다.
async function loadPost(): Promise<
  (req: Request) => Response | Promise<Response>
> {
  const mod = await import('../../app/api/tickets/route');
  return mod.POST;
}

// --- 날짜 유틸: "오늘" 기준 상대 날짜를 YYYY-MM-DD 로 --------------------------
// Zod 스키마가 new Date().toISOString().split('T')[0] (UTC) 로 "오늘"을 판정하므로
// 미래 날짜는 넉넉한 오프셋(+10일 이상)을 써서 타임존 경계 문제를 피한다.
function isoDatePlusDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

// --- 요청 헬퍼 --------------------------------------------------------------
async function postTickets(body: unknown): Promise<Response> {
  const POST = await loadPost();
  return (await POST(
    new Request('http://localhost/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )) as Response;
}

const TICKET_FIELDS = [
  'id',
  'title',
  'description',
  'status',
  'priority',
  'position',
  'plannedStartDate',
  'dueDate',
  'startedAt',
  'completedAt',
  'createdAt',
  'updatedAt',
] as const;

beforeEach(async () => {
  await truncateTickets();
});

afterAll(async () => {
  await closeDb();
});

describe('POST /api/tickets — 티켓 생성 (TC-API-001)', () => {
  it('001-2: 모든 필드를 포함한 정상 생성 → 201', async () => {
    const input = {
      title: 'API 설계 문서 작성',
      description: 'REST API 엔드포인트와 요청/응답 형식을 정의한다',
      priority: 'HIGH',
      plannedStartDate: isoDatePlusDays(10),
      dueDate: isoDatePlusDays(20),
    };

    const res = await postTickets(input);
    expect(res.status).toBe(201);

    const body = await res.json();

    // 응답에 12개 필드가 모두 존재
    for (const field of TICKET_FIELDS) {
      expect(body).toHaveProperty(field);
    }

    expect(typeof body.id).toBe('number');
    expect(body.title).toBe(input.title);
    expect(body.description).toBe(input.description);
    expect(body.status).toBe('BACKLOG'); // 생성 시 항상 BACKLOG
    expect(body.priority).toBe('HIGH');
    expect(typeof body.position).toBe('number');
    expect(body.plannedStartDate).toBe(input.plannedStartDate);
    expect(body.dueDate).toBe(input.dueDate);
    expect(body.startedAt).toBeNull();
    expect(body.completedAt).toBeNull();
    // 시스템 타임스탬프는 ISO 8601 문자열
    expect(typeof body.createdAt).toBe('string');
    expect(typeof body.updatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(body.updatedAt))).toBe(false);
  });

  it('001-1: 제목만으로 최소 생성 → 201, priority 는 MEDIUM', async () => {
    const res = await postTickets({ title: '테스트 할일' });
    expect(res.status).toBe(201);

    const body = await res.json();

    expect(typeof body.id).toBe('number');
    expect(body.title).toBe('테스트 할일');
    expect(body.status).toBe('BACKLOG');
    expect(body.priority).toBe('MEDIUM'); // 기본값
    expect(body.description).toBeNull();
    expect(body.plannedStartDate).toBeNull();
    expect(body.dueDate).toBeNull();
    expect(body.startedAt).toBeNull();
    expect(body.completedAt).toBeNull();
  });

  it('001-3: 제목 누락 → 400, "제목을 입력해주세요"', async () => {
    const res = await postTickets({});
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('제목을 입력해주세요');
  });

  it('001-6: 제목 200자 초과 → 400, "제목은 200자 이내로 입력해주세요"', async () => {
    const res = await postTickets({ title: 'a'.repeat(201) });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('제목은 200자 이내로 입력해주세요');
  });

  it('001-9: 과거 종료예정일 → 400, "종료예정일은 오늘 이후 날짜를 선택해주세요"', async () => {
    const res = await postTickets({ title: 'ok', dueDate: '2020-01-01' });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('종료예정일은 오늘 이후 날짜를 선택해주세요');
  });

  it('001-8: 잘못된 우선순위 값 → 400, "우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요"', async () => {
    const res = await postTickets({ title: 'ok', priority: 'URGENT' });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요');
  });
});
