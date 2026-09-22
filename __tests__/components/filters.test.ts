/**
 * filters 순수 함수 테스트 (TDD Red)
 *
 * 스펙: docs/COMPONENT_SPEC.md §2.3 FilterBar 필터 로직 예시.
 * isThisWeek: 이번 주 월~일 범위 dueDate를 가진 TODO/IN_PROGRESS
 * 티켓만 true, BACKLOG/DONE은 항상 false.
 * filterBoard: activeFilter에 따라 board를 필터링하되 BACKLOG는 항상
 * 그대로 유지한다(docs/COMPONENT_SPEC.md §2.3 동작 5).
 * 대상: src/client/components/board/filters.ts (아직 미구현)
 */

import { isThisWeek, filterBoard } from '../../src/client/components/board/filters';
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

// 기준일을 2026-09-23(수요일)로 고정 — 그 주 월요일 2026-09-21,
// 일요일 2026-09-27.
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-09-23T00:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('isThisWeek', () => {
  it('이번 주 월요일(경계값)이 dueDate이고 status=TODO면 true', () => {
    const ticket = makeTicket({ status: 'TODO', dueDate: '2026-09-21' });
    expect(isThisWeek(ticket)).toBe(true);
  });

  it('이번 주 일요일(경계값)이 dueDate이고 status=IN_PROGRESS면 true', () => {
    const ticket = makeTicket({ status: 'IN_PROGRESS', dueDate: '2026-09-27' });
    expect(isThisWeek(ticket)).toBe(true);
  });

  it('다음 주 월요일이 dueDate면 false', () => {
    const ticket = makeTicket({ status: 'TODO', dueDate: '2026-09-28' });
    expect(isThisWeek(ticket)).toBe(false);
  });

  it('dueDate가 없으면 false', () => {
    const ticket = makeTicket({ status: 'TODO', dueDate: null });
    expect(isThisWeek(ticket)).toBe(false);
  });

  it('status가 BACKLOG면 이번 주 dueDate라도 항상 false', () => {
    const ticket = makeTicket({ status: 'BACKLOG', dueDate: '2026-09-23' });
    expect(isThisWeek(ticket)).toBe(false);
  });

  it('status가 DONE이면 이번 주 dueDate라도 항상 false', () => {
    const ticket = makeTicket({ status: 'DONE', dueDate: '2026-09-23' });
    expect(isThisWeek(ticket)).toBe(false);
  });
});

describe('filterBoard', () => {
  function makeBoard(): BoardData {
    return {
      BACKLOG: [makeTicket({ id: 1, status: 'BACKLOG', dueDate: '2026-09-23' })],
      TODO: [
        makeTicket({ id: 2, status: 'TODO', dueDate: '2026-09-23' }),
        makeTicket({ id: 3, status: 'TODO', dueDate: '2020-01-01', isOverdue: true }),
      ],
      IN_PROGRESS: [],
      DONE: [],
    };
  }

  it("activeFilter='all'이면 board를 그대로 반환한다", () => {
    const board = makeBoard();
    expect(filterBoard(board, 'all')).toEqual(board);
  });

  it("activeFilter='thisWeek'이면 TODO/IN_PROGRESS만 이번 주 dueDate로 필터링하고 BACKLOG는 그대로 유지한다", () => {
    const board = makeBoard();
    const result = filterBoard(board, 'thisWeek');

    expect(result.BACKLOG).toEqual(board.BACKLOG);
    expect(result.TODO.map((t) => t.id)).toEqual([2]);
  });

  it("activeFilter='overdue'면 isOverdue=true인 티켓만 남기고 BACKLOG는 그대로 유지한다", () => {
    const board = makeBoard();
    const result = filterBoard(board, 'overdue');

    expect(result.BACKLOG).toEqual(board.BACKLOG);
    expect(result.TODO.map((t) => t.id)).toEqual([3]);
  });
});
