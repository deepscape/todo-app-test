// docs/COMPONENT_SPEC.md §3 Badge (우선순위 표시), docs/DESIGN_SYSTEM.md
// §3/§5(배지 11px Semi-bold, Tailwind 팔레트 색). app/globals.css
// --color-priority-{low,medium,high}-{bg,text} 토큰 기반 Tailwind
// 유틸리티로 스타일링한다.
import type { TicketPriority } from '@/shared/types';

interface PriorityBadgeProps {
  priority: TicketPriority;
}

const PRIORITY_CLASSES: Record<TicketPriority, string> = {
  LOW: 'bg-priority-low-bg text-priority-low-text',
  MEDIUM: 'bg-priority-medium-bg text-priority-medium-text',
  HIGH: 'bg-priority-high-bg text-priority-high-text',
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span
      data-priority={priority}
      className={`${PRIORITY_CLASSES[priority]} rounded-badge px-2 py-0.5 text-[11px] font-semibold`}
    >
      {priority}
    </span>
  );
}
