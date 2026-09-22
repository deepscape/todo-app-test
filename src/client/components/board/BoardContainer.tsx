// docs/COMPONENT_SPEC.md §2.1 BoardContainer, docs/FRONTEND_TASKS.md
// Phase 6.1. Phase 1~5 컴포넌트 + useTickets를 조합하는 최상위 클라이언트
// 컴포넌트 — 보드 전체 상태 관리, DnD 이벤트 핸들링, API 통신 총괄.
'use client';

import { useState } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useTickets } from '@/client/hooks/useTickets';
import { Board } from './Board';
import { BoardHeader } from './BoardHeader';
import { FilterBar, type BoardFilter } from './FilterBar';
import { filterBoard } from './filters';
import { calculatePosition, resolveDropTarget } from './dndHelpers';
import { Modal } from '@/client/components/ui/Modal';
import { TicketForm, type TicketFormValues } from '@/client/components/ticket/TicketForm';
import { TicketModal } from '@/client/components/ticket/TicketModal';
import type { BoardData, TicketStatus, TicketWithMeta } from '@/shared/types';
import { TICKET_STATUS } from '@/shared/types';
import type { UpdateTicketInput } from '@/shared/validations/ticket';

interface BoardContainerProps {
  initialData: BoardData;
}

export function BoardContainer({ initialData }: BoardContainerProps) {
  const { board, isLoading, create, update, remove, reorder, complete } =
    useTickets(initialData);

  const [activeTicket, setActiveTicket] = useState<TicketWithMeta | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithMeta | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [activeFilter, setActiveFilter] = useState<BoardFilter>('all');

  // FilterBar에 보여줄 카운트는 filterBoard를 그대로 재사용해 구한다 —
  // "몇 건이 이 필터에 해당하는가"와 "실제로 필터링된 결과"가 항상 같은
  // 로직을 쓰도록 하기 위함.
  const thisWeekFiltered = filterBoard(board, 'thisWeek');
  const overdueFiltered = filterBoard(board, 'overdue');
  const counts = {
    thisWeek: thisWeekFiltered.TODO.length + thisWeekFiltered.IN_PROGRESS.length,
    overdue: overdueFiltered.TODO.length + overdueFiltered.IN_PROGRESS.length,
  };

  const visibleBoard = filterBoard(board, activeFilter);

  function findTicketById(id: number): TicketWithMeta | null {
    for (const status of Object.keys(board) as TicketStatus[]) {
      const found = board[status].find((t) => t.id === id);
      if (found) return found;
    }
    return null;
  }

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = findTicketById(Number(event.active.id));
    setActiveTicket(ticket);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTicket(null);

    const { active, over } = event;
    if (!over) return;

    const activeTicketId = Number(active.id);
    const target = resolveDropTarget(board, activeTicketId, over.id as number | string);
    if (!target) return;

    const draggedTicket = findTicketById(activeTicketId);
    if (!draggedTicket) return;

    if (target.status === TICKET_STATUS.DONE) {
      const nextBoard = moveTicketInBoard(board, draggedTicket, 'DONE', 0);
      complete(activeTicketId, nextBoard);
      return;
    }

    const position = calculatePosition(
      board[target.status].filter((t) => t.id !== activeTicketId),
      target.targetIndex
    );
    const nextBoard = moveTicketInBoard(
      board,
      draggedTicket,
      target.status,
      target.targetIndex
    );
    reorder(
      { ticketId: activeTicketId, status: target.status as 'BACKLOG' | 'TODO' | 'IN_PROGRESS', position },
      nextBoard
    );
  };

  const handleCreateSubmit = async (values: TicketFormValues) => {
    await create(values);
    setIsCreating(false);
  };

  const handleUpdateSubmit = async (id: number, values: UpdateTicketInput) => {
    await update(id, values);
    setSelectedTicket(null);
  };

  const handleDelete = async (id: number) => {
    await remove(id);
    setSelectedTicket(null);
  };

  return (
    <div className="flex h-screen flex-col">
      <BoardHeader onCreateClick={() => setIsCreating(true)} />
      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
      />
      <div className="flex-1 overflow-auto p-4">
        <Board
          board={visibleBoard}
          onTicketClick={setSelectedTicket}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          activeTicket={activeTicket}
        />
      </div>

      <Modal isOpen={isCreating} onClose={() => setIsCreating(false)}>
        <TicketForm
          mode="create"
          onSubmit={handleCreateSubmit}
          onCancel={() => setIsCreating(false)}
          isLoading={isLoading}
        />
      </Modal>

      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          isOpen={selectedTicket !== null}
          onClose={() => setSelectedTicket(null)}
          onUpdate={handleUpdateSubmit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

// 드래그된 티켓을 board에서 옮겨(원래 칼럼에서 제거) 대상 칼럼의
// targetIndex 위치에 삽입한 새 BoardData를 만든다. reorder/complete
// API 성공 전, 낙관적으로 화면에 즉시 반영할 상태를 계산하기 위함.
function moveTicketInBoard(
  board: BoardData,
  ticket: TicketWithMeta,
  targetStatus: TicketStatus,
  targetIndex: number
): BoardData {
  const next: BoardData = {
    BACKLOG: board.BACKLOG.filter((t) => t.id !== ticket.id),
    TODO: board.TODO.filter((t) => t.id !== ticket.id),
    IN_PROGRESS: board.IN_PROGRESS.filter((t) => t.id !== ticket.id),
    DONE: board.DONE.filter((t) => t.id !== ticket.id),
  };

  const movedTicket: TicketWithMeta = { ...ticket, status: targetStatus };
  const targetColumn = [...next[targetStatus]];
  targetColumn.splice(targetIndex, 0, movedTicket);
  next[targetStatus] = targetColumn;

  return next;
}
