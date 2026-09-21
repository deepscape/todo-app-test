// docs/COMPONENT_SPEC.md §2.7 TicketModal 표시 필드 중 읽기 전용
// 4개(status/startedAt/completedAt/createdAt)만 다루는 서브컴포넌트.
// DnD/완료 처리로만 바뀌는 값이라 여기서는 표시만 하고 편집 UI를 두지
// 않는다.
import type { TicketWithMeta } from '@/shared/types';

interface TicketDetailViewProps {
  ticket: TicketWithMeta;
}

function formatDate(value: Date | null): string {
  if (!value) return '-';
  return new Date(value).toISOString().slice(0, 10);
}

export function TicketDetailView({ ticket }: TicketDetailViewProps) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <div>
        <dt className="text-text-muted">상태</dt>
        <dd className="text-text-primary">{ticket.status}</dd>
      </div>
      <div>
        <dt className="text-text-muted">시작일</dt>
        <dd className="text-text-primary">{formatDate(ticket.startedAt)}</dd>
      </div>
      <div>
        <dt className="text-text-muted">종료일</dt>
        <dd className="text-text-primary">
          {formatDate(ticket.completedAt)}
        </dd>
      </div>
      <div>
        <dt className="text-text-muted">생성일</dt>
        <dd className="text-text-primary">{formatDate(ticket.createdAt)}</dd>
      </div>
    </dl>
  );
}
