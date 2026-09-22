// docs/FRONTEND_TASKS.md Phase 3.1 TicketCard의 종료예정일/오버듀 표시
// 요구사항을 분리한 컴포넌트. dueDate가 없으면 아무것도 렌더하지 않는다.
// isOverdue일 때 app/globals.css의 --color-overdue 토큰(border/text)을
// 사용해 시각적으로 강조한다.
interface DueDateBadgeProps {
  dueDate: string | null;
  isOverdue: boolean;
}

export function DueDateBadge({ dueDate, isOverdue }: DueDateBadgeProps) {
  if (!dueDate) return null;

  const overdueClasses = isOverdue
    ? 'border-overdue text-overdue'
    : 'border-card-border text-text-muted';

  return (
    <span
      className={`${overdueClasses} rounded-badge border px-2 py-0.5 text-[11px] font-semibold`}
    >
      {dueDate}
    </span>
  );
}
