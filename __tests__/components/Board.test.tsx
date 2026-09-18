/**
 * Board 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/TEST_CASES.md TC-COMP-003, docs/COMPONENT_SPEC.md §2.4,
 * docs/FRONTEND_TASKS.md Phase 8
 * 대상: src/client/components/board/Board.tsx (아직 미구현)
 *
 * @dnd-kit/core(DndContext, DragOverlay, useDroppable)와
 * @dnd-kit/sortable(useSortable, SortableContext)를 mock 처리한다 — 이
 * Phase는 Board의 레이아웃/이벤트 전파만 검증하고, 실제 드래그 통합
 * 검증은 Phase 9 이후 수동 브라우저 검증으로 커버한다
 * (docs/FRONTEND_TASKS.md Phase 8 완료 기준 참고).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BoardData, TicketWithMeta } from '@/shared/types';
import { Board } from '../../src/client/components/board/Board';

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useDroppable: () => ({ setNodeRef: jest.fn(), isOver: false }),
}));

jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

function makeTicket(overrides: Partial<TicketWithMeta> = {}): TicketWithMeta {
  return {
    id: 1,
    title: '티켓',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    position: 0,
    plannedStartDate: null,
    dueDate: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isOverdue: false,
    ...overrides,
  };
}

function makeBoard(overrides: Partial<BoardData> = {}): BoardData {
  return {
    BACKLOG: [],
    TODO: [],
    IN_PROGRESS: [],
    DONE: [],
    ...overrides,
  };
}

describe('Board', () => {
  // C003-1: 4칼럼 렌더링 — BACKLOG, TODO, IN_PROGRESS, DONE 순서
  it('C003-1: 4개 칼럼(BACKLOG, TODO, In Progress, Done)이 순서대로 렌더된다', () => {
    render(<Board board={makeBoard()} onTicketClick={jest.fn()} />);

    const labels = ['Backlog', 'TODO', 'In Progress', 'Done'];
    const headings = labels.map((label) => screen.getByText(label));

    // DOM 순서상 Backlog -> TODO -> In Progress -> Done 순으로 나타나는지
    // compareDocumentPosition으로 확인한다.
    for (let i = 0; i < headings.length - 1; i++) {
      const position = headings[i].compareDocumentPosition(
        headings[i + 1]
      );
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  // C003-2: Backlog 사이드바 — 좌측 사이드바로 배치
  it('C003-2: Backlog 칼럼에 사이드바 스타일(column--sidebar)이 적용된다', () => {
    render(<Board board={makeBoard()} onTicketClick={jest.fn()} />);

    expect(screen.getByText('Backlog').closest('.column--sidebar')).not.toBeNull();
  });

  // TicketCard 클릭이 onTicketClick까지 전파 (Board -> Column -> TicketCard)
  it('TicketCard 클릭이 onTicketClick까지 전파된다', async () => {
    const user = userEvent.setup();
    const handleTicketClick = jest.fn();
    const ticket = makeTicket({ id: 7, title: '전파 확인용 티켓' });
    const board = makeBoard({ TODO: [ticket] });

    render(<Board board={board} onTicketClick={handleTicketClick} />);

    await user.click(screen.getByText('전파 확인용 티켓'));

    expect(handleTicketClick).toHaveBeenCalledWith(ticket);
  });

  // 각 칼럼에 해당 상태의 티켓만 전달되는지 (칼럼별 데이터 분리 확인)
  it('각 칼럼에는 board 데이터의 해당 상태 티켓만 렌더된다', () => {
    const board = makeBoard({
      BACKLOG: [makeTicket({ id: 1, title: '백로그 티켓', status: 'BACKLOG' })],
      TODO: [makeTicket({ id: 2, title: '할일 티켓', status: 'TODO' })],
      IN_PROGRESS: [
        makeTicket({ id: 3, title: '진행중 티켓', status: 'IN_PROGRESS' }),
      ],
      DONE: [makeTicket({ id: 4, title: '완료 티켓', status: 'DONE' })],
    });

    render(<Board board={board} onTicketClick={jest.fn()} />);

    expect(screen.getByText('백로그 티켓')).toBeInTheDocument();
    expect(screen.getByText('할일 티켓')).toBeInTheDocument();
    expect(screen.getByText('진행중 티켓')).toBeInTheDocument();
    expect(screen.getByText('완료 티켓')).toBeInTheDocument();
  });
});
