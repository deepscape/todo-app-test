// docs/COMPONENT_SPEC.md §2.6 TicketCard, docs/TEST_CASES.md TC-COMP-001,
// docs/DESIGN_SYSTEM.md §3/§5. app/globals.css의 .ticket-card 계열
// 클래스(TC-COMP-001 C001-2, C001-3)와 PriorityBadge/DueDateBadge를
// 조합한다. 카드 타이틀은 14px Bold(§3), padding 12px(p-3, §5).
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KeyboardEvent } from 'react';
import type { TicketWithMeta } from '@/shared/types';
import { PriorityBadge } from '../ui/PriorityBadge';
import { DueDateBadge } from '../ui/DueDateBadge';

interface TicketCardProps {
  ticket: TicketWithMeta;
  onClick: () => void;
}

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  const classes = [
    'ticket-card',
    'flex flex-col gap-2 p-3',
    ticket.status === 'DONE' ? 'ticket-card--done' : '',
    isDragging ? 'ticket-card--dragging' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={classes}
      data-overdue={ticket.isOverdue}
      aria-label={`티켓: ${ticket.title}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
    >
      <p className="truncate text-sm font-bold text-text-primary">
        {ticket.title}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority={ticket.priority} />
        <DueDateBadge dueDate={ticket.dueDate} isOverdue={ticket.isOverdue} />
      </div>
    </div>
  );
}
