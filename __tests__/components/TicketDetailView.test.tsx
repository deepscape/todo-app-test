/**
 * TicketDetailView 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/COMPONENT_SPEC.md §2.7 TicketModal 표시 필드 중 읽기 전용
 * 4개(status/startedAt/completedAt/createdAt). TicketModal의 서브 컴포넌트.
 * 대상: src/client/components/ticket/TicketDetailView.tsx (아직 미구현)
 */

import { render, screen } from '@testing-library/react';
import { TicketDetailView } from '../../src/client/components/ticket/TicketDetailView';
import type { TicketWithMeta } from '../../src/shared/types';

function makeTicket(overrides: Partial<TicketWithMeta> = {}): TicketWithMeta {
  return {
    id: 1,
    title: '샘플 티켓',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    position: 0,
    plannedStartDate: null,
    dueDate: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    isOverdue: false,
    ...overrides,
  };
}

describe('TicketDetailView', () => {
  // status/startedAt/completedAt/createdAt이 읽기 전용(입력 요소가 아닌
  // 텍스트)으로 표시되는지 확인
  it('status/시작일/종료일/생성일이 읽기 전용 텍스트로 표시된다', () => {
    render(
      <TicketDetailView
        ticket={makeTicket({
          status: 'IN_PROGRESS',
          startedAt: new Date('2026-09-05T00:00:00.000Z'),
          completedAt: new Date('2026-09-10T00:00:00.000Z'),
          createdAt: new Date('2026-09-01T00:00:00.000Z'),
        })}
      />
    );

    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
    expect(screen.getByText('2026-09-05')).toBeInTheDocument();
    expect(screen.getByText('2026-09-10')).toBeInTheDocument();
    expect(screen.getByText('2026-09-01')).toBeInTheDocument();

    // 편집 불가 — input/select/textarea 요소가 전혀 없어야 한다
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('startedAt/completedAt이 null이면 "-"로 표시된다', () => {
    render(
      <TicketDetailView
        ticket={makeTicket({
          status: 'BACKLOG',
          startedAt: null,
          completedAt: null,
        })}
      />
    );

    const dashes = screen.getAllByText('-');
    expect(dashes).toHaveLength(2);
  });

  it('라벨(상태/시작일/종료일/생성일)이 함께 렌더된다', () => {
    render(<TicketDetailView ticket={makeTicket()} />);

    expect(screen.getByText('상태')).toBeInTheDocument();
    expect(screen.getByText('시작일')).toBeInTheDocument();
    expect(screen.getByText('종료일')).toBeInTheDocument();
    expect(screen.getByText('생성일')).toBeInTheDocument();
  });
});
