// docs/COMPONENT_SPEC.md §2.5 Column, docs/TEST_CASES.md TC-COMP-002,
// docs/DESIGN_SYSTEM.md §4 Column Colors. SortableContext +
// useDroppable로 드롭 대상 영역을 구성하고, TicketCard 목록을
// 렌더링한다. 각 칼럼은 고유 파스텔 배경 + 액센트로 구분한다. BACKLOG는
// 사이드바 스타일(column--sidebar), DONE은 서버가 이미 24시간
// 필터링해서 내려주므로 그대로 렌더한다.
'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { TicketStatus, TicketWithMeta } from '@/shared/types';
import { COLUMN_LABELS } from '@/shared/types';
import { TicketCard } from '../ticket/TicketCard';
import { ColumnHeader } from './ColumnHeader';

interface ColumnProps {
  status: TicketStatus;
  tickets: TicketWithMeta[];
  onTicketClick: (ticket: TicketWithMeta) => void;
}

// docs/DESIGN_SYSTEM.md §4: 칼럼별 배경 + 액센트(칼럼 상단 포인트 바).
const COLUMN_STYLES: Record<TicketStatus, { bg: string; accent: string }> = {
  BACKLOG: { bg: 'bg-column-backlog-bg', accent: 'bg-column-backlog-accent' },
  TODO: { bg: 'bg-column-todo-bg', accent: 'bg-column-todo-accent' },
  IN_PROGRESS: {
    bg: 'bg-column-inprogress-bg',
    accent: 'bg-column-inprogress-accent',
  },
  DONE: { bg: 'bg-column-done-bg', accent: 'bg-column-done-accent' },
};

export function Column({ status, tickets, onTicketClick }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });
  const { bg, accent } = COLUMN_STYLES[status];

  const classes = [
    bg,
    'rounded-card flex flex-col min-h-screen overflow-hidden',
    status === 'BACKLOG' ? 'column--sidebar' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={setNodeRef} className={classes}>
      <div className={`${accent} h-1`} />
      <ColumnHeader label={COLUMN_LABELS[status]} count={tickets.length} />
      <SortableContext items={tickets.map((t) => t.id)}>
        <div className="gap-card-gap flex flex-col p-2">
          {tickets.length === 0 ? (
            <p className="text-xs text-text-muted">
              이 칼럼에 티켓이 없습니다
            </p>
          ) : (
            tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => onTicketClick(ticket)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
