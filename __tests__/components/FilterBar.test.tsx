/**
 * FilterBar 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/COMPONENT_SPEC.md §2.3 FilterBar, docs/FRONTEND_TASKS.md
 * Phase 5.2. "이번주 업무" / "일정 초과" 필터 버튼 + 카운트 표시, 클릭
 * 시 onFilterChange, 활성 필터 재클릭 시 'all'로 토글 해제, 활성 필터
 * 스타일 표시.
 * 대상: src/client/components/board/FilterBar.tsx (아직 미구현)
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '../../src/client/components/board/FilterBar';

describe('FilterBar', () => {
  it('"이번주 업무" 버튼에 counts.thisWeek이 숫자로 표시된다', () => {
    render(
      <FilterBar
        activeFilter="all"
        onFilterChange={jest.fn()}
        counts={{ thisWeek: 3, overdue: 1 }}
      />
    );

    expect(screen.getByRole('button', { name: /이번주 업무/ })).toHaveTextContent('3');
  });

  it('"일정 초과" 버튼에 counts.overdue가 숫자로 표시된다', () => {
    render(
      <FilterBar
        activeFilter="all"
        onFilterChange={jest.fn()}
        counts={{ thisWeek: 3, overdue: 1 }}
      />
    );

    expect(screen.getByRole('button', { name: /일정 초과/ })).toHaveTextContent('1');
  });

  it('"이번주 업무" 클릭 시 onFilterChange("thisWeek")가 호출된다', async () => {
    const user = userEvent.setup();
    const handleFilterChange = jest.fn();

    render(
      <FilterBar
        activeFilter="all"
        onFilterChange={handleFilterChange}
        counts={{ thisWeek: 3, overdue: 1 }}
      />
    );

    await user.click(screen.getByRole('button', { name: /이번주 업무/ }));

    expect(handleFilterChange).toHaveBeenCalledWith('thisWeek');
  });

  it('"일정 초과" 클릭 시 onFilterChange("overdue")가 호출된다', async () => {
    const user = userEvent.setup();
    const handleFilterChange = jest.fn();

    render(
      <FilterBar
        activeFilter="all"
        onFilterChange={handleFilterChange}
        counts={{ thisWeek: 3, overdue: 1 }}
      />
    );

    await user.click(screen.getByRole('button', { name: /일정 초과/ }));

    expect(handleFilterChange).toHaveBeenCalledWith('overdue');
  });

  it('activeFilter="thisWeek"일 때 "이번주 업무"를 다시 클릭하면 onFilterChange("all")가 호출된다(토글 해제)', async () => {
    const user = userEvent.setup();
    const handleFilterChange = jest.fn();

    render(
      <FilterBar
        activeFilter="thisWeek"
        onFilterChange={handleFilterChange}
        counts={{ thisWeek: 3, overdue: 1 }}
      />
    );

    await user.click(screen.getByRole('button', { name: /이번주 업무/ }));

    expect(handleFilterChange).toHaveBeenCalledWith('all');
  });

  it('활성 필터 버튼에 active 스타일(aria-pressed=true)이 적용된다', () => {
    render(
      <FilterBar
        activeFilter="overdue"
        onFilterChange={jest.fn()}
        counts={{ thisWeek: 3, overdue: 1 }}
      />
    );

    expect(screen.getByRole('button', { name: /일정 초과/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /이번주 업무/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});
