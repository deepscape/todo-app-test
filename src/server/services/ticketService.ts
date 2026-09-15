// 티켓 비즈니스 로직 (FR-001 티켓 생성, FR-002/FR-006 보드 조회).
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { tickets } from '../db/schema';
import { COLUMN_ORDER, TICKET_STATUS } from '@/shared/types';
import type {
  BoardData,
  Ticket,
  TicketStatus,
  TicketWithMeta,
} from '@/shared/types';
import type {
  CreateTicketInput,
  UpdateTicketInput,
} from '@/shared/validations/ticket';

// 특정 칼럼(status)의 min(position) - 1024 (맨 위 배치). 칼럼이 비어
// 있으면 0. 티켓 생성(BACKLOG) 및 완료 처리(DONE) 양쪽에서 공유한다
// (docs/REQUIREMENTS.md §FR-001, docs/DATA_MODEL.md §5.5).
async function nextTopPosition(status: TicketStatus): Promise<number> {
  const [{ min }] = await db
    .select({ min: sql<number | null>`min(${tickets.position})` })
    .from(tickets)
    .where(eq(tickets.status, status));

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
      position: await nextTopPosition(TICKET_STATUS.BACKLOG),
      plannedStartDate: input.plannedStartDate ?? null,
      dueDate: input.dueDate ?? null,
    })
    .returning();

  return ticket;
}

// 오버듀 판정 (FR-003, docs/DATA_MODEL.md §5.3): 종료예정일이 지났고 아직
// 완료(DONE)되지 않은 티켓만 true. DB에 저장하지 않는 파생 값이다.
export function isOverdue(ticket: Ticket): boolean {
  if (!ticket.dueDate) return false;
  if (ticket.status === TICKET_STATUS.DONE) return false;
  const today = new Date().toISOString().split('T')[0];
  return ticket.dueDate < today;
}

// Done 24시간 가시성 (FR-004, docs/DATA_MODEL.md §5.4): 완료된 지 24시간이
// 지난 티켓은 보드 조회에서 숨긴다 (삭제하지 않고 조회 결과에서만 제외).
function isDoneVisible(ticket: Ticket): boolean {
  if (ticket.status !== TICKET_STATUS.DONE) return false;
  if (!ticket.completedAt) return false;
  const diffMs = Date.now() - ticket.completedAt.getTime();
  return diffMs <= 24 * 60 * 60 * 1000;
}

// 보드 조회 (FR-001~FR-006): 전체 티켓을 status, position 오름차순으로
// 조회한 뒤 4개 칼럼으로 그룹화하고, isOverdue를 계산해 붙이며 Done 칼럼은
// 24시간 가시성 규칙으로 필터링한다 (research.md Decision 2, 3).
export async function getBoard(): Promise<{ board: BoardData; total: number }> {
  const allTickets = await db
    .select()
    .from(tickets)
    .orderBy(asc(tickets.status), asc(tickets.position));

  const board = COLUMN_ORDER.reduce((acc, status) => {
    acc[status] = [];
    return acc;
  }, {} as BoardData);

  let total = 0;
  for (const ticket of allTickets) {
    const typedTicket = ticket as Ticket;
    if (
      typedTicket.status === TICKET_STATUS.DONE &&
      !isDoneVisible(typedTicket)
    ) {
      continue;
    }
    board[typedTicket.status].push({
      ...typedTicket,
      isOverdue: isOverdue(typedTicket),
    });
    total += 1;
  }

  return { board, total };
}

// 상세 조회 (FR-001, FR-002): 존재하지 않으면 null을 반환해 Route Handler가
// 404로 변환하도록 한다 (research.md Decision 3).
export async function getById(id: number): Promise<TicketWithMeta | null> {
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id))
    .limit(1);

  if (!ticket) return null;

  const typedTicket = ticket as Ticket;
  return { ...typedTicket, isOverdue: isOverdue(typedTicket) };
}

// 부분 수정 (FR-003~FR-008): 전달된 필드만 갱신한다. description/
// plannedStartDate/dueDate는 undefined(미전달)와 null(명시적 삭제)을
// 구분해야 하므로 키 존재 여부('in')로 판정한다 (research.md Decision 2).
// status/position/startedAt/completedAt은 절대 건드리지 않는다 (FR-007).
export async function update(
  id: number,
  input: UpdateTicketInput
): Promise<TicketWithMeta | null> {
  const existing = await getById(id);
  if (!existing) return null;

  const patch: Partial<
    Pick<
      Ticket,
      'title' | 'description' | 'priority' | 'plannedStartDate' | 'dueDate'
    >
  > = {};

  if (input.title !== undefined) patch.title = input.title;
  if ('description' in input) patch.description = input.description ?? null;
  if (input.priority !== undefined) patch.priority = input.priority;
  if ('plannedStartDate' in input) {
    patch.plannedStartDate = input.plannedStartDate ?? null;
  }
  if ('dueDate' in input) patch.dueDate = input.dueDate ?? null;

  const [updated] = await db
    .update(tickets)
    .set(patch)
    .where(eq(tickets.id, id))
    .returning();

  const typedTicket = updated as Ticket;
  return { ...typedTicket, isOverdue: isOverdue(typedTicket) };
}

// 완료 처리 (FR-001~FR-003, FR-005, FR-006): 임의 상태의 티켓을 DONE으로
// 전환하고 completedAt을 현재 시각으로, position을 DONE 칼럼 맨 위로
// 설정한다. 이전 상태가 이미 DONE이어도 동일하게 갱신한다(멱등,
// research.md Decision 3).
export async function complete(id: number): Promise<TicketWithMeta | null> {
  const existing = await getById(id);
  if (!existing) return null;

  const [updated] = await db
    .update(tickets)
    .set({
      status: TICKET_STATUS.DONE,
      completedAt: new Date(),
      position: await nextTopPosition(TICKET_STATUS.DONE),
    })
    .where(eq(tickets.id, id))
    .returning();

  const typedTicket = updated as Ticket;
  return { ...typedTicket, isOverdue: isOverdue(typedTicket) };
}

// 영구 삭제 (FR-009, FR-010): 하드 삭제, 되돌릴 수 없다.
export async function remove(id: number): Promise<boolean> {
  const existing = await getById(id);
  if (!existing) return false;

  await db.delete(tickets).where(eq(tickets.id, id));
  return true;
}
