// 티켓 비즈니스 로직 (FR-001 티켓 생성, FR-002/FR-006 보드 조회).
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { tickets } from '../db/schema';
import { COLUMN_ORDER, TICKET_STATUS } from '@/shared/types';
import type { BoardData, Ticket } from '@/shared/types';
import type { CreateTicketInput } from '@/shared/validations/ticket';

// 생성 시 position: BACKLOG 칼럼의 min(position) - 1024 (맨 위 배치).
// 칼럼이 비어 있으면 0 (docs/REQUIREMENTS.md §FR-001).
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

// 오버듀 판정 (FR-003, docs/DATA_MODEL.md §5.3): 종료예정일이 지났고 아직
// 완료(DONE)되지 않은 티켓만 true. DB에 저장하지 않는 파생 값이다.
function isOverdue(ticket: Ticket): boolean {
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
