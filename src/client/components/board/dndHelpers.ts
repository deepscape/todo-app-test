// 드래그앤드롭 낙관적 업데이트를 위한 순수 함수들 (docs/API_SPEC.md §7
// position 재계산 로직, docs/COMPONENT_SPEC.md §5.1 드래그앤드롭 흐름).
// BoardContainer의 onDragEnd에서 사용한다.
import type { BoardData, TicketStatus, TicketWithMeta } from '@/shared/types';
import { COLUMN_ORDER } from '@/shared/types';

// 서버(PATCH /api/tickets/reorder)와 동일한 규칙으로 낙관적 position을
// 계산한다: 맨 앞 삽입은 첫 카드 - 1024, 맨 뒤 삽입은 마지막 카드 +
// 1024, 두 카드 사이는 (prev + next) / 2. 서버가 최종적으로 정확한 값과
// (필요 시) 간격 재정렬을 계산해 응답으로 확정하므로, 여기서는 UI가
// 즉시 반응하도록 근사값만 계산하면 된다.
export function calculatePosition(
  tickets: TicketWithMeta[],
  targetIndex: number
): number {
  if (tickets.length === 0) return 0;

  if (targetIndex <= 0) {
    return tickets[0].position - 1024;
  }

  if (targetIndex >= tickets.length) {
    return tickets[tickets.length - 1].position + 1024;
  }

  const prev = tickets[targetIndex - 1].position;
  const next = tickets[targetIndex].position;
  return (prev + next) / 2;
}

export interface DropTarget {
  status: TicketStatus;
  targetIndex: number;
}

// dnd-kit의 DragEndEvent(active.id, over.id)로부터 대상 칼럼과 그 안의
// 삽입 인덱스를 판별한다.
// - over.id가 칼럼 status 자체라면(빈 칼럼 위, 또는 칼럼 끝 여백) 그
//   칼럼의 맨 뒤에 삽입.
// - over.id가 다른 티켓 id라면 그 티켓이 속한 칼럼의, 그 티켓 위치에
//   삽입(같은 칼럼 안에서 자기 자신을 옮기는 경우, 자신을 제거한
//   배열 기준으로 인덱스를 보정한다).
export function resolveDropTarget(
  board: BoardData,
  activeTicketId: number,
  overId: number | string
): DropTarget | null {
  // over가 칼럼 컨테이너(빈 칼럼의 useDroppable id) 자체인 경우.
  if (typeof overId === 'string' && (COLUMN_ORDER as string[]).includes(overId)) {
    const status = overId as TicketStatus;
    const tickets = board[status].filter((t) => t.id !== activeTicketId);
    return { status, targetIndex: tickets.length };
  }

  // over가 다른 티켓 카드 위인 경우, 그 카드가 속한 칼럼을 찾는다.
  for (const status of COLUMN_ORDER) {
    const tickets = board[status];
    const overIndex = tickets.findIndex((t) => t.id === overId);
    if (overIndex === -1) continue;

    // 드래그 중인 티켓을 제외한 배열 기준으로 삽입 인덱스를 계산한다.
    const withoutActive = tickets.filter((t) => t.id !== activeTicketId);
    const overTicketId = tickets[overIndex].id;
    const targetIndex = withoutActive.findIndex((t) => t.id === overTicketId);

    return {
      status,
      targetIndex: targetIndex === -1 ? withoutActive.length : targetIndex,
    };
  }

  return null;
}
