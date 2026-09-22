/**
 * PriorityBadge 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/FRONTEND_TASKS.md Phase 1.1 Badge, docs/COMPONENT_SPEC.md §3
 * Badge — 우선순위 표시 LOW(회색)/MEDIUM(파란색)/HIGH(빨간색), 작은 텍스트
 * + 둥근 패딩. app/globals.css의 --color-priority-{low,medium,high}-{bg,text}
 * 토큰을 사용한다.
 *
 * 대상: src/client/components/ui/PriorityBadge.tsx (아직 미구현)
 */

import { render, screen } from '@testing-library/react';
import { PriorityBadge } from '../../src/client/components/ui/PriorityBadge';

describe('PriorityBadge', () => {
  it('priority="LOW" → bg-priority-low-bg 클래스와 "LOW" 텍스트를 렌더한다', () => {
    render(<PriorityBadge priority="LOW" />);
    const badge = screen.getByText('LOW');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-priority-low-bg');
    expect(badge).toHaveClass('text-priority-low-text');
  });

  it('priority="MEDIUM" → bg-priority-medium-bg 클래스와 "MEDIUM" 텍스트를 렌더한다', () => {
    render(<PriorityBadge priority="MEDIUM" />);
    const badge = screen.getByText('MEDIUM');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-priority-medium-bg');
    expect(badge).toHaveClass('text-priority-medium-text');
  });

  it('priority="HIGH" → bg-priority-high-bg 클래스와 "HIGH" 텍스트를 렌더한다', () => {
    render(<PriorityBadge priority="HIGH" />);
    const badge = screen.getByText('HIGH');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-priority-high-bg');
    expect(badge).toHaveClass('text-priority-high-text');
  });

  it('둥근 패딩(rounded-badge)과 11px 배지 텍스트(docs/DESIGN_SYSTEM.md §3) 스타일을 적용한다', () => {
    render(<PriorityBadge priority="LOW" />);
    const badge = screen.getByText('LOW');
    expect(badge).toHaveClass('rounded-badge');
    expect(badge).toHaveClass('text-[11px]');
  });
});
