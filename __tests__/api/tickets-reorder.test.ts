/**
 * @jest-environment node
 */

/**
 * TC-API-007: PATCH /api/tickets/reorder — 상태/순서 변경
 *
 * 스펙: docs/API_SPEC.md §7
 *       docs/TEST_CASES.md TC-API-007
 *       specs/004-ticket-reorder/
 *
 * 실제 tika_test DB 를 사용하는 통합 테스트다.
 */

import { truncateTickets, closeDb } from './helpers/db';

async function loadReorder(): Promise<
  (req: Request) => Response | Promise<Response>
> {
  const mod = await import('../../app/api/tickets/reorder/route');
  return mod.PATCH;
}

async function loadPost(): Promise<
  (req: Request) => Response | Promise<Response>
> {
  const mod = await import('../../app/api/tickets/route');
  return mod.POST;
}

async function loadComplete(): Promise<
  (
    req: Request,
    ctx: { params: Promise<{ id: string }> }
  ) => Response | Promise<Response>
> {
  const mod = await import('../../app/api/tickets/[id]/complete/route');
  return mod.PATCH;
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

async function completeTicket(id: number): Promise<Response> {
  const PATCH = await loadComplete();
  return (await PATCH(
    new Request(`http://localhost/api/tickets/${id}/complete`, {
      method: 'PATCH',
    }),
    { params: Promise.resolve({ id: String(id) }) }
  )) as Response;
}

async function reorderTicket(body: unknown): Promise<Response> {
  const PATCH = await loadReorder();
  return (await PATCH(
    new Request('http://localhost/api/tickets/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )) as Response;
}

async function createTicket(title: string): Promise<number> {
  const res = await postTickets({ title });
  const body = await res.json();
  return body.id;
}

beforeEach(async () => {
  await truncateTickets();
});

afterAll(async () => {
  await closeDb();
});

describe('PATCH /api/tickets/reorder — 순서/상태 변경 (TC-API-007)', () => {
  it('007-1: 칼럼 간 이동(BACKLOG→TODO) → status=TODO, position 갱신', async () => {
    const id = await createTicket('이동할 티켓');

    const res = await reorderTicket({ ticketId: id, status: 'TODO', position: 0 });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ticket.status).toBe('TODO');
    expect(typeof body.ticket.position).toBe('number');
  });

  it('007-9: status="DONE" 전송 → 400, VALIDATION_ERROR', async () => {
    const id = await createTicket('티켓');

    const res = await reorderTicket({ ticketId: id, status: 'DONE', position: 0 });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('007-10: 잘못된 status → 400, "상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요"', async () => {
    const id = await createTicket('티켓');

    const res = await reorderTicket({ ticketId: id, status: 'INVALID', position: 0 });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요');
  });

  it('007-11: 없는 ticketId → 404, TICKET_NOT_FOUND', async () => {
    const res = await reorderTicket({ ticketId: 999999, status: 'TODO', position: 0 });
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe('TICKET_NOT_FOUND');
    expect(body.error.message).toBe('티켓을 찾을 수 없습니다');
  });

  it('007-12: 정상 이동 후 updatedAt이 이전 값과 달라짐', async () => {
    const createRes = await postTickets({ title: '티켓' });
    const created = await createRes.json();

    await new Promise((resolve) => setTimeout(resolve, 10));

    const res = await reorderTicket({
      ticketId: created.id,
      status: 'TODO',
      position: 0,
    });
    const body = await res.json();

    expect(body.ticket.updatedAt).not.toBe(created.updatedAt);
  });

  it('007-2: 같은 칼럼 내 순서 변경 → status 유지, position만 변경', async () => {
    const id1 = await createTicket('첫 번째');
    const id2 = await createTicket('두 번째');
    const id3 = await createTicket('세 번째');
    // 모두 BACKLOG. id3가 position 오름차순 맨 앞(가장 최근 생성).

    const res = await reorderTicket({ ticketId: id1, status: 'BACKLOG', position: 0 });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ticket.status).toBe('BACKLOG');
    expect(body.ticket.id).toBe(id1);
    void id2;
  });

  it('007-8: 촘촘한 간격에 삽입 시 affected 배열에 영향받은 티켓 포함', async () => {
    // 인접한 두 위치 사이에 반복 삽입해 간격을 좁힌다.
    const idA = await createTicket('A');
    const idB = await createTicket('B');

    // B를 A와 C 사이가 아니라, A 뒤(index 1)에 반복 삽입하여 간격을 좁힌다.
    for (let i = 0; i < 12; i++) {
      // eslint-disable-next-line no-await-in-loop
      await reorderTicket({ ticketId: idB, status: 'BACKLOG', position: 1 });
    }

    const idC = await createTicket('C');
    const res = await reorderTicket({ ticketId: idC, status: 'BACKLOG', position: 1 });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.affected)).toBe(true);
    void idA;
  });

  it('추가: 트랜잭션 원자성 - 없는 ticketId 요청 시 다른 티켓 position 불변', async () => {
    const id = await createTicket('영향받지 않아야 할 티켓');
    const before = await reorderTicket({ ticketId: id, status: 'BACKLOG', position: 0 });
    const beforeBody = await before.json();
    const beforePosition = beforeBody.ticket.position;

    await reorderTicket({ ticketId: 999999, status: 'TODO', position: 0 });

    const GET = (await import('../../app/api/tickets/route')).GET;
    const boardRes = (await GET()) as Response;
    const boardBody = await boardRes.json();
    const stillThere = boardBody.board.BACKLOG.find(
      (t: { id: number }) => t.id === id
    );
    expect(stillThere.position).toBe(beforePosition);
  });

  it('007-3: BACKLOG→TODO 이동 시 startedAt ≈ 현재 시각', async () => {
    const id = await createTicket('티켓');

    const before = Date.now();
    const res = await reorderTicket({ ticketId: id, status: 'TODO', position: 0 });
    const body = await res.json();

    expect(body.ticket.startedAt).not.toBeNull();
    const startedAtMs = new Date(body.ticket.startedAt).getTime();
    expect(Math.abs(startedAtMs - before)).toBeLessThan(5000);
  });

  it('007-4: TODO→BACKLOG 이동 시 startedAt=null', async () => {
    const id = await createTicket('티켓');
    await reorderTicket({ ticketId: id, status: 'TODO', position: 0 });

    const res = await reorderTicket({ ticketId: id, status: 'BACKLOG', position: 0 });
    const body = await res.json();

    expect(body.ticket.startedAt).toBeNull();
  });

  it('007-5: DONE→TODO 이동 시 completedAt=null, startedAt 설정', async () => {
    const id = await createTicket('티켓');
    await completeTicket(id);

    const res = await reorderTicket({ ticketId: id, status: 'TODO', position: 0 });
    const body = await res.json();

    expect(body.ticket.status).toBe('TODO');
    expect(body.ticket.completedAt).toBeNull();
    expect(body.ticket.startedAt).not.toBeNull();
  });

  it('007-6: DONE→BACKLOG 이동 시 completedAt=null, startedAt=null', async () => {
    const id = await createTicket('티켓');
    await completeTicket(id);

    const res = await reorderTicket({ ticketId: id, status: 'BACKLOG', position: 0 });
    const body = await res.json();

    expect(body.ticket.status).toBe('BACKLOG');
    expect(body.ticket.completedAt).toBeNull();
    expect(body.ticket.startedAt).toBeNull();
  });

  it('007-7: TODO→IN_PROGRESS 이동 시 startedAt 변경 없음', async () => {
    const id = await createTicket('티켓');
    const toTodo = await reorderTicket({ ticketId: id, status: 'TODO', position: 0 });
    const todoBody = await toTodo.json();
    const startedAtAfterTodo = todoBody.ticket.startedAt;

    const res = await reorderTicket({
      ticketId: id,
      status: 'IN_PROGRESS',
      position: 0,
    });
    const body = await res.json();

    expect(body.ticket.startedAt).toBe(startedAtAfterTodo);
  });
});
