/**
 * dndHelpers 순수 함수 테스트 (TDD Red)
 *
 * 스펙: docs/API_SPEC.md §7 PATCH /api/tickets/reorder의 position
 * 재계산 로직(두 카드 사이 (prev+next)/2, 맨 앞 -1024, 맨 뒤 +1024)을
 * 클라이언트 낙관적 업데이트에서도 동일하게 사용한다. resolveDropTarget은
 * dnd-kit의 DragEndEvent(active.id, over.id)로부터 대상 칼럼과 그 안의
 * 삽입 인덱스를 판별한다 — over가 칼럼 자체(빈 칼럼/맨 뒤)일 수도, 다른
 * 카드(그 카드 앞에 삽입) 위일 수도 있다.
 * 대상: src/client/components/board/dndHelpers.ts (아직 미구현)
 */

import { calculatePosition, resolveDropTarget } from '../../src/client/components/board/dndHelpers';
import type { BoardData, TicketWithMeta } from '../../src/shared/types';

function makeTicket(overrides: Partial<TicketWithMeta>): TicketWithMeta {
  return {
    id: 1,
    title: 't',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    position: 0,
    plannedStartDate: null,
    dueDate: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isOverdue: false,
    ...overrides,
  };
}

describe('calculatePosition', () => {
  it('빈 칼럼에 삽입하면 0을 반환한다', () => {
    expect(calculatePosition([], 0)).toBe(0);
  });

  it('맨 앞에 삽입하면 첫 번째 카드의 position - 1024', () => {
    const tickets = [makeTicket({ id: 1, position: 100 })];
    expect(calculatePosition(tickets, 0)).toBe(100 - 1024);
  });

  it('맨 뒤에 삽입하면 마지막 카드의 position + 1024', () => {
    const tickets = [
      makeTicket({ id: 1, position: 0 }),
      makeTicket({ id: 2, position: 100 }),
    ];
    expect(calculatePosition(tickets, 2)).toBe(100 + 1024);
  });

  it('두 카드 사이에 삽입하면 (prev + next) / 2', () => {
    const tickets = [
      makeTicket({ id: 1, position: 0 }),
      makeTicket({ id: 2, position: 100 }),
    ];
    expect(calculatePosition(tickets, 1)).toBe(50);
  });
});

describe('resolveDropTarget', () => {
  function makeBoard(): BoardData {
    return {
      BACKLOG: [],
      TODO: [
        makeTicket({ id: 1, status: 'TODO', position: 0 }),
        makeTicket({ id: 2, status: 'TODO', position: 100 }),
      ],
      IN_PROGRESS: [],
      DONE: [],
    };
  }

  it('over가 빈 칼럼 id면 그 칼럼의 맨 뒤(현재 티켓 수)를 targetIndex로 반환한다', () => {
    const board = makeBoard();
    const result = resolveDropTarget(board, 1, 'IN_PROGRESS');

    expect(result).toEqual({ status: 'IN_PROGRESS', targetIndex: 0 });
  });

  it('over가 다른 카드 id면 그 카드의 status와 인덱스를 targetIndex로 반환한다', () => {
    const board = makeBoard();
    // ticketId 3(다른 칼럼에서 옴)을 TODO의 ticket 2(index 1) 위로 드롭
    const result = resolveDropTarget(board, 3, 2);

    expect(result).toEqual({ status: 'TODO', targetIndex: 1 });
  });

  it('같은 칼럼 내에서 자기 자신보다 뒤로 옮기면 옮겨질 자신의 위치만큼 인덱스가 보정된다', () => {
    const board = makeBoard();
    // ticket 1(TODO, index 0)을 ticket 2(TODO, index 1) 위로 드롭 ->
    // 자신이 제거된 배열 기준으로 ticket 2는 index 0이 된다
    const result = resolveDropTarget(board, 1, 2);

    expect(result).toEqual({ status: 'TODO', targetIndex: 0 });
  });

  it('대상을 찾을 수 없으면 null을 반환한다', () => {
    const board = makeBoard();
    const result = resolveDropTarget(board, 1, 999);

    expect(result).toBeNull();
  });
});
