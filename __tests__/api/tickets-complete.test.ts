/**
 * @jest-environment node
 */

/**
 * TC-API-005: PATCH /api/tickets/:id/complete — 티켓 완료
 *
 * 스펙: docs/API_SPEC.md §5
 *       docs/TEST_CASES.md TC-API-005
 *       specs/003-ticket-complete/
 *
 * 실제 tika_test DB 를 사용하는 통합 테스트다.
 */

import { truncateTickets, closeDb } from './helpers/db';

async function loadComplete(): Promise<
  (
    req: Request,
    ctx: { params: Promise<{ id: string }> }
  ) => Response | Promise<Response>
> {
  const mod = await import('../../app/api/tickets/[id]/complete/route');
  return mod.PATCH;
}

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

async function completeTicket(id: string): Promise<Response> {
  const PATCH = await loadComplete();
  return (await PATCH(
    new Request(`http://localhost/api/tickets/${id}/complete`, {
      method: 'PATCH',
    }),
    { params: Promise.resolve({ id }) }
  )) as Response;
}

beforeEach(async () => {
  await truncateTickets();
});

afterAll(async () => {
  await closeDb();
});

describe('PATCH /api/tickets/:id/complete — 완료 처리 (TC-API-005)', () => {
  it('005-1: 정상 완료 처리 → 200, status=DONE, completedAt 설정', async () => {
    const createRes = await postTickets({ title: '완료할 티켓' });
    const created = await createRes.json();

    const res = await completeTicket(String(created.id));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('DONE');
    expect(body.completedAt).not.toBeNull();
  });

  it('005-2: completedAt이 현재 시각과 5초 이내로 근접', async () => {
    const createRes = await postTickets({ title: '완료할 티켓' });
    const created = await createRes.json();

    const before = Date.now();
    const res = await completeTicket(String(created.id));
    const body = await res.json();

    const completedAtMs = new Date(body.completedAt).getTime();
    expect(Math.abs(completedAtMs - before)).toBeLessThan(5000);
  });

  it('005-4: 없는 티켓 완료 처리 → 404, TICKET_NOT_FOUND', async () => {
    const res = await completeTicket('999999');
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe('TICKET_NOT_FOUND');
    expect(body.error.message).toBe('티켓을 찾을 수 없습니다');
  });

  it('005-5: updatedAt이 완료 처리 전과 달라짐', async () => {
    const createRes = await postTickets({ title: '완료할 티켓' });
    const created = await createRes.json();

    await new Promise((resolve) => setTimeout(resolve, 10));

    const res = await completeTicket(String(created.id));
    const body = await res.json();

    expect(body.updatedAt).not.toBe(created.updatedAt);
  });

  it('추가: 이미 DONE인 티켓을 다시 완료 처리해도 200, completedAt 갱신', async () => {
    const createRes = await postTickets({ title: '완료할 티켓' });
    const created = await createRes.json();

    const first = await completeTicket(String(created.id));
    const firstBody = await first.json();

    await new Promise((resolve) => setTimeout(resolve, 10));

    const second = await completeTicket(String(created.id));
    expect(second.status).toBe(200);

    const secondBody = await second.json();
    expect(secondBody.status).toBe('DONE');
    expect(secondBody.completedAt).not.toBe(firstBody.completedAt);
  });

  it('005-3: 이미 완료된 티켓이 있는 상태에서 새로 완료한 티켓이 DONE 배열 맨 앞에 나타남', async () => {
    const first = await postTickets({ title: '먼저 완료' });
    const firstCreated = await first.json();
    await completeTicket(String(firstCreated.id));

    const second = await postTickets({ title: '나중에 완료' });
    const secondCreated = await second.json();
    await completeTicket(String(secondCreated.id));

    const GET = await loadGet();
    const res = (await GET()) as Response;
    const body = await res.json();

    expect(body.board.DONE[0].id).toBe(secondCreated.id);
  });
});
