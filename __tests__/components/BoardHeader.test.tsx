/**
 * BoardHeader 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/COMPONENT_SPEC.md §2.2 BoardHeader, docs/FRONTEND_TASKS.md
 * Phase 5.1. "Tika" 타이틀 + SearchInput(2차, 비활성 placeholder) +
 * CreateTicketButton("새 업무", onCreateClick).
 * 대상: src/client/components/board/BoardHeader.tsx (아직 미구현)
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardHeader } from '../../src/client/components/board/BoardHeader';

describe('BoardHeader', () => {
  it('"Tika" 타이틀이 렌더된다', () => {
    render(<BoardHeader onCreateClick={jest.fn()} />);

    expect(screen.getByText('Tika')).toBeInTheDocument();
  });

  it('"새 업무" 버튼 클릭 시 onCreateClick이 호출된다', async () => {
    const user = userEvent.setup();
    const handleCreateClick = jest.fn();

    render(<BoardHeader onCreateClick={handleCreateClick} />);

    await user.click(screen.getByRole('button', { name: '새 업무' }));

    expect(handleCreateClick).toHaveBeenCalledTimes(1);
  });

  it('검색창이 placeholder와 함께 렌더된다', () => {
    render(<BoardHeader onCreateClick={jest.fn()} />);

    expect(screen.getByPlaceholderText('검색 (준비 중)')).toBeInTheDocument();
  });

  it('검색창은 비활성(disabled) 상태다', () => {
    render(<BoardHeader onCreateClick={jest.fn()} />);

    expect(screen.getByPlaceholderText('검색 (준비 중)')).toBeDisabled();
  });
});
