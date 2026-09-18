// docs/COMPONENT_SPEC.md §2.5 Column의 "칼럼 헤더에 칼럼명 + 티켓 수 뱃지
// 표시" 요구사항을 분리한 컴포넌트 (docs/FRONTEND_TASKS.md Phase 4.2).
interface ColumnHeaderProps {
  label: string;
  count: number;
}

export function ColumnHeader({ label, count }: ColumnHeaderProps) {
  return (
    <div className="bg-column-header-bg rounded-t-card flex items-center justify-between px-3 py-2">
      <span className="text-sm font-semibold text-text-primary">
        {label}
      </span>
      <span className="bg-neutral text-text-secondary rounded-badge px-2 py-0.5 text-xs font-medium">
        {count}
      </span>
    </div>
  );
}
