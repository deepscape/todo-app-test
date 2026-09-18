/**
 * TicketCard 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/TEST_CASES.md TC-COMP-001, docs/COMPONENT_SPEC.md §2.6,
 * docs/FRONTEND_TASKS.md Phase 3.1
 * 대상: src/client/components/ticket/TicketCard.tsx (아직 미구현)
 *
 * @dnd-kit/sortable의 useSortable은 DndContext 없이 단독 렌더가
 * 불가능하므로 mock 처리한다 — 이 Phase에서는 DnD 동작 자체가 아니라
 * TicketCard의 표시/이벤트 로직만 검증한다 (실제 드래그 통합 검증은
 * Column/Board 단계에서).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TicketWithMeta } from '@/shared/types';
import { TicketCard } from '../../src/client/components/ticket/TicketCard';

jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

function makeTicket(overrides: Partial<TicketWithMeta> = {}): TicketWithMeta {
  return {
    id: 1,
    title: '기본 티켓 제목',
    description: null,
    status: 'BACKLOG',
    priority: 'MEDIUM',
    position: 0,
    plannedStartDate: null,
    dueDate: '2026-12-31',
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    isOverdue: false,
    ...overrides,
  };
}

describe('TicketCard', () => {
  // C001-1: 기본 렌더링 — 제목, 우선순위 뱃지, 종료예정일 표시
  it('C001-1: 제목, 우선순위 뱃지, 종료예정일이 렌더된다', () => {
    const ticket = makeTicket({
      title: '기본 렌더링 티켓',
      priority: 'HIGH',
      dueDate: '2026-09-20',
    });

    render(<TicketCard ticket={ticket} onClick={jest.fn()} />);

    expect(screen.getByText('기본 렌더링 티켓')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('2026-09-20')).toBeInTheDocument();
  });

  // C001-2: 오버듀 표시 — isOverdue=true → data-overdue 속성
  it('C001-2: isOverdue=true면 카드에 data-overdue="true" 속성이 붙는다', () => {
    const ticket = makeTicket({ isOverdue: true, dueDate: '2020-01-01' });

    render(<TicketCard ticket={ticket} onClick={jest.fn()} />);

    expect(screen.getByRole('button')).toHaveAttribute(
      'data-overdue',
      'true'
    );
  });

  it('C001-2b: isOverdue=false면 data-overdue="false"이다', () => {
    const ticket = makeTicket({ isOverdue: false });

    render(<TicketCard ticket={ticket} onClick={jest.fn()} />);

    expect(screen.getByRole('button')).toHaveAttribute(
      'data-overdue',
      'false'
    );
  });

  // C001-3: 완료 상태 — status=DONE → ticket-card--done 클래스
  it('C001-3: status=DONE이면 ticket-card--done 클래스가 적용된다', () => {
    const ticket = makeTicket({ status: 'DONE' });

    render(<TicketCard ticket={ticket} onClick={jest.fn()} />);

    expect(screen.getByRole('button')).toHaveClass('ticket-card--done');
  });

  it('C001-3b: status가 DONE이 아니면 ticket-card--done 클래스가 없다', () => {
    const ticket = makeTicket({ status: 'TODO' });

    render(<TicketCard ticket={ticket} onClick={jest.fn()} />);

    expect(screen.getByRole('button')).not.toHaveClass('ticket-card--done');
  });

  // C001-4: dueDate=null → 날짜 영역 숨김
  it('C001-4: dueDate=null이면 종료예정일 영역이 렌더되지 않는다', () => {
    const ticket = makeTicket({ dueDate: null });

    render(<TicketCard ticket={ticket} onClick={jest.fn()} />);

    // 유효한 날짜 형식(YYYY-MM-DD) 텍스트가 전혀 없어야 한다.
    expect(screen.queryByText(/^\d{4}-\d{2}-\d{2}$/)).not.toBeInTheDocument();
  });

  // C001-5: 클릭 이벤트 → onClick 호출
  it('C001-5: 카드를 클릭하면 onClick이 호출된다', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    const ticket = makeTicket();

    render(<TicketCard ticket={ticket} onClick={handleClick} />);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('C001-5b: Enter 키 입력 시에도 onClick이 호출된다 (키보드 접근성)', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    const ticket = makeTicket();

    render(<TicketCard ticket={ticket} onClick={handleClick} />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // C001-6: 긴 제목(200자) → 말줄임(...) 처리 클래스
  it('C001-6: 200자 제목이어도 그대로 렌더되며 말줄임 클래스(truncate)가 적용된다', () => {
    const longTitle = 'a'.repeat(200);
    const ticket = makeTicket({ title: longTitle });

    render(<TicketCard ticket={ticket} onClick={jest.fn()} />);

    const titleEl = screen.getByText(longTitle);
    expect(titleEl).toBeInTheDocument();
    expect(titleEl).toHaveClass('truncate');
  });

  // C001-7: 우선순위별 뱃지 data-priority 속성
  it.each(['LOW', 'MEDIUM', 'HIGH'] as const)(
    'C001-7: priority=%s면 뱃지에 data-priority="%s" 속성이 붙는다',
    (priority) => {
      const ticket = makeTicket({ priority });

      render(<TicketCard ticket={ticket} onClick={jest.fn()} />);

      expect(screen.getByText(priority)).toHaveAttribute(
        'data-priority',
        priority
      );
    }
  );

  // 접근성: role="button", aria-label="티켓: {title}" (docs/COMPONENT_SPEC.md §2.6)
  it('접근성: role="button"과 aria-label="티켓: {title}"을 가진다', () => {
    const ticket = makeTicket({ title: '접근성 확인용 티켓' });

    render(<TicketCard ticket={ticket} onClick={jest.fn()} />);

    const card = screen.getByRole('button', {
      name: '티켓: 접근성 확인용 티켓',
    });
    expect(card).toBeInTheDocument();
  });
});
