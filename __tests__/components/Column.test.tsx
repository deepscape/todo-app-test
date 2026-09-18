/**
 * Column 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/TEST_CASES.md TC-COMP-002, docs/COMPONENT_SPEC.md §2.5,
 * docs/FRONTEND_TASKS.md Phase 5
 * 대상: src/client/components/board/Column.tsx (아직 미구현)
 *
 * @dnd-kit/sortable(useSortable, SortableContext)과 @dnd-kit/core
 * (useDroppable)를 mock 처리한다 — 이 Phase는 Column의 표시/이벤트 로직만
 * 검증하고, 실제 드래그 통합 검증은 Board/BoardContainer 단계에서 한다.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TicketWithMeta } from '@/shared/types';
import { Column } from '../../src/client/components/board/Column';

jest.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: jest.fn(),
    isOver: false,
  }),
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

describe('Column', () => {
  // C002-1: 티켓 있는 칼럼 → 카드 목록 표시
  it('C002-1: tickets 배열의 각 항목이 TicketCard로 렌더된다', () => {
    const tickets = [
      makeTicket({ id: 1, title: '첫 번째 티켓' }),
      makeTicket({ id: 2, title: '두 번째 티켓' }),
    ];

    render(
      <Column status="TODO" tickets={tickets} onTicketClick={jest.fn()} />
    );

    expect(screen.getByText('첫 번째 티켓')).toBeInTheDocument();
    expect(screen.getByText('두 번째 티켓')).toBeInTheDocument();
  });

  // C002-2: 빈 칼럼 → "이 칼럼에 티켓이 없습니다" 안내
  it('C002-2: tickets=[]이면 "이 칼럼에 티켓이 없습니다" 안내가 렌더된다', () => {
    render(<Column status="TODO" tickets={[]} onTicketClick={jest.fn()} />);

    expect(
      screen.getByText('이 칼럼에 티켓이 없습니다')
    ).toBeInTheDocument();
  });

  it('티켓이 있으면 빈 칼럼 안내가 렌더되지 않는다', () => {
    const tickets = [makeTicket()];

    render(
      <Column status="TODO" tickets={tickets} onTicketClick={jest.fn()} />
    );

    expect(
      screen.queryByText('이 칼럼에 티켓이 없습니다')
    ).not.toBeInTheDocument();
  });

  // C002-3: 칼럼 헤더 → 칼럼명 + 티켓 수 표시 (COLUMN_LABELS 사용)
  it('C002-3: ColumnHeader에 COLUMN_LABELS 기준 칼럼명이 전달된다', () => {
    render(
      <Column status="IN_PROGRESS" tickets={[]} onTicketClick={jest.fn()} />
    );

    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('C002-3b: ColumnHeader에 tickets.length가 전달된다', () => {
    const tickets = [makeTicket({ id: 1 }), makeTicket({ id: 2 }), makeTicket({ id: 3 })];

    render(
      <Column status="TODO" tickets={tickets} onTicketClick={jest.fn()} />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  // TicketCard 클릭 시 onTicketClick(ticket) 호출
  it('TicketCard 클릭 시 onTicketClick이 해당 티켓으로 호출된다', async () => {
    const user = userEvent.setup();
    const handleTicketClick = jest.fn();
    const ticket = makeTicket({ id: 42, title: '클릭할 티켓' });

    render(
      <Column
        status="TODO"
        tickets={[ticket]}
        onTicketClick={handleTicketClick}
      />
    );

    await user.click(screen.getByText('클릭할 티켓'));

    expect(handleTicketClick).toHaveBeenCalledWith(ticket);
  });

  // BACKLOG 전용 스타일 분기 (docs/COMPONENT_SPEC.md §2.5)
  it('status="BACKLOG"이면 사이드바 스타일(column--sidebar 클래스)이 적용된다', () => {
    const { container } = render(
      <Column status="BACKLOG" tickets={[]} onTicketClick={jest.fn()} />
    );

    expect(container.firstChild).toHaveClass('column--sidebar');
  });

  it('status="BACKLOG"이 아니면 사이드바 스타일이 적용되지 않는다', () => {
    const { container } = render(
      <Column status="TODO" tickets={[]} onTicketClick={jest.fn()} />
    );

    expect(container.firstChild).not.toHaveClass('column--sidebar');
  });
});
