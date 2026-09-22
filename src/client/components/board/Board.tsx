// docs/COMPONENT_SPEC.md §2.4 Board, docs/TEST_CASES.md TC-COMP-003.
// Backlog 사이드바 + TODO/IN_PROGRESS/DONE 3칼럼 그리드 레이아웃.
// DndContext/DragOverlay를 감싸고, onDragStart/onDragEnd 이벤트는 그대로
// BoardContainer(Phase 6)로 전달한다 — 대상 칼럼 판별, position 계산,
// API 분기 같은 실제 드래그 로직은 이 컴포넌트가 알지 못한다.
'use client';

import { DndContext, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { BoardData, TicketWithMeta } from '@/shared/types';
import { COLUMN_ORDER, TICKET_STATUS } from '@/shared/types';
import { Column } from './Column';
import { TicketCard } from '../ticket/TicketCard';

interface BoardProps {
  board: BoardData;
  onTicketClick: (ticket: TicketWithMeta) => void;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  activeTicket?: TicketWithMeta | null;
}

export function Board({
  board,
  onTicketClick,
  onDragStart,
  onDragEnd,
  activeTicket,
}: BoardProps) {
  const mainColumns = COLUMN_ORDER.filter(
    (status) => status !== TICKET_STATUS.BACKLOG
  );

  return (
    <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-full flex-col gap-4 md:flex-row">
        <Column
          status={TICKET_STATUS.BACKLOG}
          tickets={board[TICKET_STATUS.BACKLOG]}
          onTicketClick={onTicketClick}
        />
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mainColumns.map((status) => (
            <Column
              key={status}
              status={status}
              tickets={board[status]}
              onTicketClick={onTicketClick}
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeTicket ? (
          <TicketCard ticket={activeTicket} onClick={() => {}} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
