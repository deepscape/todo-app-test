// 티켓 비즈니스 로직 (FR-001 티켓 생성).
import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { tickets } from '../db/schema';
import { TICKET_STATUS } from '@/shared/types';
import type { Ticket } from '@/shared/types';
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
