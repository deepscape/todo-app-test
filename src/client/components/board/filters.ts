// FilterBar 순수 필터 로직 (docs/COMPONENT_SPEC.md §2.3). 필터는
// 클라이언트 사이드에서 board 데이터를 필터링한다 — 별도 API 호출 없음.
// BACKLOG 칼럼에는 필터가 적용되지 않는다(항상 전체 표시).
import type { BoardData, TicketWithMeta } from '@/shared/types';
import type { BoardFilter } from './FilterBar';

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay(); // 0=일요일 ... 6=토요일
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function getSunday(date: Date): Date {
  const monday = getMonday(date);
  const result = new Date(monday);
  result.setDate(result.getDate() + 6);
  return result;
}

// 이번 주 월~일 범위 내 dueDate를 가진 TODO/IN_PROGRESS 티켓만 true.
export function isThisWeek(ticket: TicketWithMeta): boolean {
  if (!ticket.dueDate) return false;
  if (ticket.status === 'BACKLOG' || ticket.status === 'DONE') return false;

  const today = new Date();
  const monday = getMonday(today);
  const sunday = getSunday(today);

  return (
    ticket.dueDate >= toDateString(monday) &&
    ticket.dueDate <= toDateString(sunday)
  );
}

// activeFilter에 따라 board를 필터링한다. BACKLOG는 항상 그대로 유지.
export function filterBoard(board: BoardData, activeFilter: BoardFilter): BoardData {
  if (activeFilter === 'all') return board;

  const predicate =
    activeFilter === 'thisWeek'
      ? isThisWeek
      : (ticket: TicketWithMeta) => ticket.isOverdue;

  return {
    BACKLOG: board.BACKLOG,
    TODO: board.TODO.filter(predicate),
    IN_PROGRESS: board.IN_PROGRESS.filter(predicate),
    DONE: board.DONE,
  };
}
