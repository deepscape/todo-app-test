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

import {
  truncateTickets,
  closeDb,
  setCompletedAt,
  setDueDate,
} from './helpers/db';

// app/api/tickets/route.ts 는 아직 미구현 (TDD Red).
// 파일 최상단에서 import 하면 스위트 전체가 로드 전 죽으므로,
// 요청 시점에 동적 import 하여 각 테스트가 개별적으로 실패하게 한다.
async function loadPost(): Promise<
  (req: Request) => Response | Promise<Response>
> {
  const mod = await import('../../app/api/tickets/route');
  return mod.POST;
}

async function loadGet(): Promise<() => Response | Promise<Response>> {
  const mod = await import('../../app/api/tickets/route');
  return mod.GET;
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

  it('001-4: 빈 제목 → 400, "제목을 입력해주세요"', async () => {
    const res = await postTickets({ title: '' });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('제목을 입력해주세요');
  });

  it('001-5: 공백만 제목 → 400, "제목을 입력해주세요"', async () => {
    const res = await postTickets({ title: '   ' });
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

  it('001-7: 설명 1000자 초과 → 400, "설명은 1000자 이내로 입력해주세요"', async () => {
    const res = await postTickets({
      title: 'ok',
      description: 'a'.repeat(1001),
    });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('설명은 1000자 이내로 입력해주세요');
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

  it('001-10: position 자동 할당 → 연속 2개 생성 시 나중 티켓의 position이 더 작음', async () => {
    const first = await postTickets({ title: '먼저 생성' });
    const firstBody = await first.json();

    const second = await postTickets({ title: '나중 생성' });
    const secondBody = await second.json();

    // nextBacklogPosition() = min(position) - 1024 (맨 위 배치)
    expect(secondBody.position).toBeLessThan(firstBody.position);
  });

  it('001-11: startedAt/completedAt 초기값 → 정상 생성 시 둘 다 null', async () => {
    const res = await postTickets({ title: '초기값 확인용 티켓' });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.startedAt).toBeNull();
    expect(body.completedAt).toBeNull();
  });
});

describe('GET /api/tickets — 보드 조회 (TC-API-002)', () => {
  it('002-1: 빈 DB → 200, 4개 칼럼 모두 빈 배열, total: 0', async () => {
    const GET = await loadGet();
    const res = (await GET()) as Response;
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.board.BACKLOG).toEqual([]);
    expect(body.board.TODO).toEqual([]);
    expect(body.board.IN_PROGRESS).toEqual([]);
    expect(body.board.DONE).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('002-2: 서로 다른 상태의 티켓들이 각자의 칼럼에 정확히 그룹화됨', async () => {
    await postTickets({ title: '백로그 티켓' });

    const GET = await loadGet();
    const res = (await GET()) as Response;
    const body = await res.json();

    expect(body.board.BACKLOG).toHaveLength(1);
    expect(body.board.BACKLOG[0].title).toBe('백로그 티켓');
    expect(body.board.TODO).toHaveLength(0);
    expect(body.board.IN_PROGRESS).toHaveLength(0);
    expect(body.board.DONE).toHaveLength(0);
  });

  it('002-4: 응답의 total이 실제 포함된 티켓 개수와 일치', async () => {
    await postTickets({ title: '티켓 1' });
    await postTickets({ title: '티켓 2' });
    await postTickets({ title: '티켓 3' });

    const GET = await loadGet();
    const res = (await GET()) as Response;
    const body = await res.json();

    expect(body.total).toBe(3);
  });

  it('002-3: 같은 칼럼 내 티켓이 position 오름차순으로 정렬됨', async () => {
    // POST는 매번 min(position) - 1024로 맨 위에 삽입하므로, 나중에 생성한
    // 티켓일수록 position이 더 작다 → 생성 역순이 곧 position 오름차순이다.
    await postTickets({ title: '첫 번째 생성' });
    await postTickets({ title: '두 번째 생성' });
    await postTickets({ title: '세 번째 생성' });

    const GET = await loadGet();
    const res = (await GET()) as Response;
    const body = await res.json();

    const titles = body.board.BACKLOG.map((t: { title: string }) => t.title);
    expect(titles).toEqual(['세 번째 생성', '두 번째 생성', '첫 번째 생성']);

    const positions = body.board.BACKLOG.map(
      (t: { position: number }) => t.position
    );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('002-5: completedAt이 24시간 이내인 DONE 티켓 → DONE 칼럼에 포함', async () => {
    const createRes = await postTickets({ title: '방금 완료한 티켓' });
    const created = await createRes.json();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await setCompletedAt(created.id, oneHourAgo);

    const GET = await loadGet();
    const res = (await GET()) as Response;
    const body = await res.json();

    const ids = body.board.DONE.map((t: { id: number }) => t.id);
    expect(ids).toContain(created.id);
  });

  it('002-6: completedAt이 24시간 이전인 DONE 티켓 → DONE 칼럼에서 제외', async () => {
    const createRes = await postTickets({ title: '오래전 완료한 티켓' });
    const created = await createRes.json();
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await setCompletedAt(created.id, twentyFiveHoursAgo);

    const GET = await loadGet();
    const res = (await GET()) as Response;
    const body = await res.json();

    const ids = body.board.DONE.map((t: { id: number }) => t.id);
    expect(ids).not.toContain(created.id);
    expect(body.total).toBe(0);
  });

  it('002-7: 각 티켓에 isOverdue boolean 값이 포함됨', async () => {
    const overdueRes = await postTickets({ title: '기한 초과 티켓' });
    const overdue = await overdueRes.json();
    await setDueDate(overdue.id, '2020-01-01');

    const doneRes = await postTickets({ title: '완료된 기한 초과 티켓' });
    const done = await doneRes.json();
    await setDueDate(done.id, '2020-01-01');
    await setCompletedAt(done.id, new Date());

    const GET = await loadGet();
    const res = (await GET()) as Response;
    const body = await res.json();

    const overdueTicket = body.board.BACKLOG.find(
      (t: { id: number }) => t.id === overdue.id
    );
    expect(overdueTicket.isOverdue).toBe(true);

    const doneTicket = body.board.DONE.find(
      (t: { id: number }) => t.id === done.id
    );
    expect(doneTicket.isOverdue).toBe(false);
  });

  it('002-7b: dueDate가 없는 티켓 → isOverdue: false (엣지 케이스)', async () => {
    const createRes = await postTickets({ title: '기한 없는 티켓' });
    const created = await createRes.json();

    const GET = await loadGet();
    const res = (await GET()) as Response;
    const body = await res.json();

    const ticket = body.board.BACKLOG.find(
      (t: { id: number }) => t.id === created.id
    );
    expect(ticket.isOverdue).toBe(false);
  });

  it('002-8: 정상 조회 시 모든 날짜 필드가 응답에 포함됨', async () => {
    const createRes = await postTickets({
      title: '날짜 필드 확인용 티켓',
      plannedStartDate: isoDatePlusDays(1),
      dueDate: isoDatePlusDays(10),
    });
    const created = await createRes.json();

    const GET = await loadGet();
    const res = (await GET()) as Response;
    const body = await res.json();

    const ticket = body.board.BACKLOG.find(
      (t: { id: number }) => t.id === created.id
    );
    expect(ticket).toHaveProperty('plannedStartDate');
    expect(ticket).toHaveProperty('dueDate');
    expect(ticket).toHaveProperty('startedAt');
    expect(ticket).toHaveProperty('completedAt');
    expect(ticket.plannedStartDate).toBe(created.plannedStartDate);
    expect(ticket.dueDate).toBe(created.dueDate);
  });
});
