/**
 * DueDateBadge 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/FRONTEND_TASKS.md Phase 3.1 TicketCard의 "종료예정일
 * (YYYY-MM-DD), 오버듀 표시(isOverdue===true일 때 빨간 테두리/아이콘)"
 * 요구사항을 별도 Badge 컴포넌트로 분리 — TicketCard(Phase 3)에서 재사용.
 *
 * 대상: src/client/components/ui/DueDateBadge.tsx (아직 미구현)
 */

import { render, screen } from '@testing-library/react';
import { DueDateBadge } from '../../src/client/components/ui/DueDateBadge';

describe('DueDateBadge', () => {
  it('dueDate가 있으면 YYYY-MM-DD 형식 그대로 렌더한다', () => {
    render(<DueDateBadge dueDate="2026-09-20" isOverdue={false} />);
    expect(screen.getByText('2026-09-20')).toBeInTheDocument();
  });

  it('dueDate가 null이면 아무것도 렌더하지 않는다', () => {
    const { container } = render(
      <DueDateBadge dueDate={null} isOverdue={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('isOverdue=true면 오버듀 강조 클래스(border-overdue)를 적용한다', () => {
    render(<DueDateBadge dueDate="2020-01-01" isOverdue />);
    expect(screen.getByText('2020-01-01')).toHaveClass('border-overdue');
  });

  it('isOverdue=false면 오버듀 강조 클래스를 적용하지 않는다', () => {
    render(<DueDateBadge dueDate="2026-12-31" isOverdue={false} />);
    expect(screen.getByText('2026-12-31')).not.toHaveClass('border-overdue');
  });

  it('isOverdue=true면 오버듀 텍스트 색상(text-overdue)을 적용한다', () => {
    render(<DueDateBadge dueDate="2020-01-01" isOverdue />);
    expect(screen.getByText('2020-01-01')).toHaveClass('text-overdue');
  });
});
