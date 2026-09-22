// docs/COMPONENT_SPEC.md §2.3 FilterBar. "이번주 업무" / "일정 초과"
// 필터 버튼 — 이미 활성화된 필터를 다시 클릭하면 'all'로 해제(토글).
// 실제 필터링 로직(isThisWeek 등)은 이 컴포넌트의 책임이 아니라 상위
// (BoardContainer/훅)에서 board를 필터링해 counts만 props로 내려준다.
import { Button } from '@/client/components/ui/Button';

export type BoardFilter = 'all' | 'thisWeek' | 'overdue';

interface FilterBarProps {
  activeFilter: BoardFilter;
  onFilterChange: (filter: BoardFilter) => void;
  counts: { thisWeek: number; overdue: number };
}

export function FilterBar({
  activeFilter,
  onFilterChange,
  counts,
}: FilterBarProps) {
  const handleClick = (filter: BoardFilter) => {
    onFilterChange(activeFilter === filter ? 'all' : filter);
  };

  return (
    <div className="flex items-center gap-2 p-4 pt-0">
      <Button
        variant={activeFilter === 'thisWeek' ? 'primary' : 'secondary'}
        aria-pressed={activeFilter === 'thisWeek'}
        onClick={() => handleClick('thisWeek')}
      >
        이번주 업무 {counts.thisWeek}
      </Button>
      <Button
        variant={activeFilter === 'overdue' ? 'primary' : 'secondary'}
        aria-pressed={activeFilter === 'overdue'}
        onClick={() => handleClick('overdue')}
      >
        일정 초과 {counts.overdue}
      </Button>
    </div>
  );
}
