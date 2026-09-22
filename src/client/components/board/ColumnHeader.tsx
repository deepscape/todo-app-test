// docs/COMPONENT_SPEC.md §2.5 Column의 "칼럼 헤더에 칼럼명 + 티켓 수 뱃지
// 표시" 요구사항을 분리한 컴포넌트 (docs/FRONTEND_TASKS.md Phase 4.2).
// docs/DESIGN_SYSTEM.md §3: 칼럼 헤더(제목)는 14px Bold. 칼럼별 파스텔
// 배경(Column.tsx) 위에 얹히므로 헤더 자체는 투명 배경으로 둔다.
interface ColumnHeaderProps {
  label: string;
  count: number;
}

export function ColumnHeader({ label, count }: ColumnHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-sm font-bold text-text-primary">{label}</span>
      <span className="bg-card-bg text-text-secondary rounded-badge px-2 py-0.5 text-xs font-semibold">
        {count}
      </span>
    </div>
  );
}
