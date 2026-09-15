/**
 * @jest-environment node
 */

/**
 * TC-API-003/004/006: /api/tickets/:id — 상세 조회 / 수정 / 삭제
 *
 * 스펙: docs/API_SPEC.md §3, §4, §6
 *       docs/TEST_CASES.md TC-API-003, TC-API-004, TC-API-006
 *       specs/002-ticket-detail-crud/
 *
 * 실제 tika_test DB 를 사용하는 통합 테스트다.
 */

import { truncateTickets, closeDb } from './helpers/db';

async function loadRoute(): Promise<{
  GET: (
    req: Request,
    ctx: { params: Promise<{ id: string }> }
  ) => Response | Promise<Response>;
  PATCH: (
    req: Request,
    ctx: { params: Promise<{ id: string }> }
  ) => Response | Promise<Response>;
  DELETE: (
    req: Request,
    ctx: { params: Promise<{ id: string }> }
  ) => Response | Promise<Response>;
}> {
  const mod = await import('../../app/api/tickets/[id]/route');
  return {
    GET: mod.GET,
    PATCH: mod.PATCH,
    DELETE: mod.DELETE,
  };
}

async function loadPost(): Promise<
  (req: Request) => Response | Promise<Response>
> {
  const mod = await import('../../app/api/tickets/route');
  return mod.POST;
}

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

async function getTicket(id: string): Promise<Response> {
  const { GET } = await loadRoute();
  return (await GET(new Request(`http://localhost/api/tickets/${id}`), {
    params: Promise.resolve({ id }),
  })) as Response;
}

async function patchTicket(id: string, body: unknown): Promise<Response> {
  const { PATCH } = await loadRoute();
  return (await PATCH(
    new Request(`http://localhost/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  )) as Response;
}

async function deleteTicket(id: string): Promise<Response> {
  const { DELETE } = await loadRoute();
  return (await DELETE(
    new Request(`http://localhost/api/tickets/${id}`, { method: 'DELETE' }),
    { params: Promise.resolve({ id }) }
  )) as Response;
}

beforeEach(async () => {
  await truncateTickets();
});

afterAll(async () => {
  await closeDb();
});

describe('GET /api/tickets/:id — 상세 조회 (TC-API-003)', () => {
  it('003-1: 존재하는 티켓 조회 → 200, 티켓 전체 데이터', async () => {
    const createRes = await postTickets({ title: '상세 조회 대상' });
    const created = await createRes.json();

    const res = await getTicket(String(created.id));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.id).toBe(created.id);
    expect(body.title).toBe('상세 조회 대상');
    expect(body.status).toBe('BACKLOG');
  });

  it('003-2: 없는 티켓 조회 → 404, TICKET_NOT_FOUND', async () => {
    const res = await getTicket('999999');
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe('TICKET_NOT_FOUND');
    expect(body.error.message).toBe('티켓을 찾을 수 없습니다');
  });

  it('003-3: 잘못된 id 형식("abc") → 400, VALIDATION_ERROR', async () => {
    const res = await getTicket('abc');
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('003-4: 정상 조회 시 isOverdue 파생 필드 포함', async () => {
    const createRes = await postTickets({ title: 'isOverdue 확인용' });
    const created = await createRes.json();

    const res = await getTicket(String(created.id));
    const body = await res.json();

    expect(body).toHaveProperty('isOverdue');
    expect(typeof body.isOverdue).toBe('boolean');
  });
});

describe('PATCH /api/tickets/:id — 수정 (TC-API-004)', () => {
  it('004-1: 제목만 수정 → 200, 제목 변경, 나머지 필드 유지', async () => {
    const createRes = await postTickets({
      title: '원래 제목',
      description: '원래 설명',
      priority: 'HIGH',
    });
    const created = await createRes.json();

    const res = await patchTicket(String(created.id), { title: '새 제목' });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.title).toBe('새 제목');
    expect(body.description).toBe('원래 설명');
    expect(body.priority).toBe('HIGH');
  });

  it('004-2: 우선순위만 변경 → 200, priority만 변경', async () => {
    const createRes = await postTickets({ title: '티켓', priority: 'LOW' });
    const created = await createRes.json();

    const res = await patchTicket(String(created.id), { priority: 'HIGH' });
    const body = await res.json();

    expect(body.priority).toBe('HIGH');
    expect(body.title).toBe('티켓');
  });

  it('004-3: description=null → 200, description이 null이 됨', async () => {
    const createRes = await postTickets({
      title: '티켓',
      description: '설명 있음',
    });
    const created = await createRes.json();

    const res = await patchTicket(String(created.id), { description: null });
    const body = await res.json();

    expect(body.description).toBeNull();
  });

  it('004-4: dueDate=null → 200, dueDate가 null이 됨', async () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 10);
    const dueDate = future.toISOString().split('T')[0];

    const createRes = await postTickets({ title: '티켓', dueDate });
    const created = await createRes.json();

    const res = await patchTicket(String(created.id), { dueDate: null });
    const body = await res.json();

    expect(body.dueDate).toBeNull();
  });

  it('004-5: plannedStartDate 수정 → 200, 값 반영', async () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 5);
    const plannedStartDate = future.toISOString().split('T')[0];

    const createRes = await postTickets({ title: '티켓' });
    const created = await createRes.json();

    const res = await patchTicket(String(created.id), { plannedStartDate });
    const body = await res.json();

    expect(body.plannedStartDate).toBe(plannedStartDate);
  });

  it('004-6: plannedStartDate=null → 200, null이 됨', async () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 5);
    const plannedStartDate = future.toISOString().split('T')[0];

    const createRes = await postTickets({ title: '티켓', plannedStartDate });
    const created = await createRes.json();

    const res = await patchTicket(String(created.id), {
      plannedStartDate: null,
    });
    const body = await res.json();

    expect(body.plannedStartDate).toBeNull();
  });

  it('004-7: 없는 티켓 수정 → 404, TICKET_NOT_FOUND', async () => {
    const res = await patchTicket('999999', { title: '새 제목' });
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe('TICKET_NOT_FOUND');
  });

  it('004-8: 아무 필드나 수정 후 updatedAt이 이전 값과 달라짐', async () => {
    const createRes = await postTickets({ title: '티켓' });
    const created = await createRes.json();

    await new Promise((resolve) => setTimeout(resolve, 10));

    const res = await patchTicket(String(created.id), { title: '변경됨' });
    const body = await res.json();

    expect(body.updatedAt).not.toBe(created.updatedAt);
  });

  it('004-9: status를 DONE으로 보내도 응답의 status는 변경되지 않음', async () => {
    const createRes = await postTickets({ title: '티켓' });
    const created = await createRes.json();

    const res = await patchTicket(String(created.id), {
      status: 'DONE',
      title: '여전히 BACKLOG',
    });
    const body = await res.json();

    expect(body.status).toBe('BACKLOG');
  });

  it('004-10: title 없이 priority만 보내면 title은 그대로 유지', async () => {
    const createRes = await postTickets({ title: '유지되어야 할 제목' });
    const created = await createRes.json();

    const res = await patchTicket(String(created.id), { priority: 'HIGH' });
    const body = await res.json();

    expect(body.title).toBe('유지되어야 할 제목');
  });
});

describe('DELETE /api/tickets/:id — 삭제 (TC-API-006)', () => {
  it('006-1: 정상 삭제 → 204 본문 없음, 재조회 시 404', async () => {
    const createRes = await postTickets({ title: '삭제될 티켓' });
    const created = await createRes.json();

    const res = await deleteTicket(String(created.id));
    expect(res.status).toBe(204);

    const refetch = await getTicket(String(created.id));
    expect(refetch.status).toBe(404);
  });

  it('006-2: 없는 티켓 삭제 → 404, TICKET_NOT_FOUND', async () => {
    const res = await deleteTicket('999999');
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe('TICKET_NOT_FOUND');
  });
});
