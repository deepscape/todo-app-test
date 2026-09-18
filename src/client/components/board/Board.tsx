// docs/COMPONENT_SPEC.md §2.4 Board, docs/TEST_CASES.md TC-COMP-003.
// Backlog 사이드바 + TODO/IN_PROGRESS/DONE 3칼럼 그리드 레이아웃.
// DndContext/DragOverlay는 여기서는 감싸기만 하고(Phase 8 범위: 레이아웃
// + 클릭 전파), 실제 드래그 이벤트 핸들링(onDragStart/onDragEnd)은
// BoardContainer(Phase 9)가 담당한다.
'use client';

import { DndContext, DragOverlay } from '@dnd-kit/core';
import type { BoardData, TicketWithMeta } from '@/shared/types';
import { COLUMN_ORDER, TICKET_STATUS } from '@/shared/types';
import { Column } from './Column';

interface BoardProps {
  board: BoardData;
  onTicketClick: (ticket: TicketWithMeta) => void;
}

export function Board({ board, onTicketClick }: BoardProps) {
  const mainColumns = COLUMN_ORDER.filter(
    (status) => status !== TICKET_STATUS.BACKLOG
  );

  return (
    <DndContext>
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
      <DragOverlay />
    </DndContext>
  );
}
