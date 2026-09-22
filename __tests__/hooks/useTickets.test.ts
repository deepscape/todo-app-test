/**
 * useTickets Hook 테스트 (TDD Red)
 *
 * 역할: ticketApi를 감싸서 board 상태 관리 + CRUD 제공.
 * 반환: { board, isLoading, error, create, update, remove, reorder, complete }
 *
 * 패턴 (create/update/remove): ticketApi 호출 성공 후 getBoard()로
 * board를 다시 불러와(refreshBoard) 최신 상태로 갱신한다. 실패 시 error
 * 상태를 설정하고, board는 이전 상태를 유지한다.
 *
 * 패턴 (reorder/complete, docs/COMPONENT_SPEC.md §4 낙관적 업데이트):
 * 드래그앤드롭은 매 프레임 즉시 반응해야 하므로 refreshBoard 왕복을
 * 기다리지 않는다. 1) 현재 board 백업 2) 호출자가 계산한 nextBoard로
 * UI 즉시 반영 3) API 호출 4) 성공 시 서버 응답(ticket 기준)으로 확정
 * 5) 실패 시 백업한 board로 롤백 + error 설정.
 *
 * ticketApi는 jest.mock으로 대체한다. 대상:
 * src/client/hooks/useTickets.ts (아직 미구현)
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTickets } from '../../src/client/hooks/useTickets';
import { ticketApi } from '../../src/client/api/ticketApi';
import type { BoardData } from '../../src/shared/types';

jest.mock('../../src/client/api/ticketApi');

const mockedTicketApi = ticketApi as jest.Mocked<typeof ticketApi>;

function makeEmptyBoard(): BoardData {
  return { BACKLOG: [], TODO: [], IN_PROGRESS: [], DONE: [] };
}

function makeBoardWithOneTicket(): BoardData {
  return {
    BACKLOG: [
      {
        id: 1,
        title: '초기 티켓',
        description: null,
        status: 'BACKLOG',
        priority: 'MEDIUM',
        position: 0,
        plannedStartDate: null,
        dueDate: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
        updatedAt: new Date('2026-09-01T00:00:00.000Z'),
        isOverdue: false,
      },
    ],
    TODO: [],
    IN_PROGRESS: [],
    DONE: [],
  };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('useTickets', () => {
  it('initialData로 board를 초기화한다', () => {
    const initialData = makeBoardWithOneTicket();

    const { result } = renderHook(() => useTickets(initialData));

    expect(result.current.board).toEqual(initialData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('create: ticketApi.create 호출 후 getBoard로 board를 갱신한다', async () => {
    const initialData = makeEmptyBoard();
    const refreshedBoard = makeBoardWithOneTicket();
    mockedTicketApi.create.mockResolvedValueOnce(refreshedBoard.BACKLOG[0]);
    mockedTicketApi.getBoard.mockResolvedValueOnce({
      board: refreshedBoard,
      total: 1,
    });

    const { result } = renderHook(() => useTickets(initialData));

    await act(async () => {
      await result.current.create({ title: '새 티켓' });
    });

    expect(mockedTicketApi.create).toHaveBeenCalledWith({ title: '새 티켓' });
    expect(mockedTicketApi.getBoard).toHaveBeenCalledTimes(1);
    expect(result.current.board).toEqual(refreshedBoard);
  });

  it('update: ticketApi.update 호출 후 getBoard로 board를 갱신한다', async () => {
    const initialData = makeBoardWithOneTicket();
    const refreshedBoard = makeBoardWithOneTicket();
    refreshedBoard.BACKLOG[0].title = '수정된 티켓';
    mockedTicketApi.update.mockResolvedValueOnce(refreshedBoard.BACKLOG[0]);
    mockedTicketApi.getBoard.mockResolvedValueOnce({
      board: refreshedBoard,
      total: 1,
    });

    const { result } = renderHook(() => useTickets(initialData));

    await act(async () => {
      await result.current.update(1, { title: '수정된 티켓' });
    });

    expect(mockedTicketApi.update).toHaveBeenCalledWith(1, {
      title: '수정된 티켓',
    });
    expect(mockedTicketApi.getBoard).toHaveBeenCalledTimes(1);
    expect(result.current.board).toEqual(refreshedBoard);
  });

  it('remove: ticketApi.remove 호출 후 getBoard로 board를 갱신한다', async () => {
    const initialData = makeBoardWithOneTicket();
    const refreshedBoard = makeEmptyBoard();
    mockedTicketApi.remove.mockResolvedValueOnce(undefined);
    mockedTicketApi.getBoard.mockResolvedValueOnce({
      board: refreshedBoard,
      total: 0,
    });

    const { result } = renderHook(() => useTickets(initialData));

    await act(async () => {
      await result.current.remove(1);
    });

    expect(mockedTicketApi.remove).toHaveBeenCalledWith(1);
    expect(mockedTicketApi.getBoard).toHaveBeenCalledTimes(1);
    expect(result.current.board).toEqual(refreshedBoard);
  });

  it('reorder: nextBoard를 즉시 반영(낙관적)한 뒤 ticketApi.reorder를 호출하고, 성공하면 서버 응답으로 확정한다', async () => {
    const initialData = makeBoardWithOneTicket();
    const optimisticBoard = makeBoardWithOneTicket();
    optimisticBoard.BACKLOG = [];
    optimisticBoard.TODO = [{ ...initialData.BACKLOG[0], status: 'TODO' }];
    const confirmedTicket = { ...optimisticBoard.TODO[0], position: 0 };
    mockedTicketApi.reorder.mockResolvedValueOnce({
      ticket: confirmedTicket as never,
      affected: [],
    });

    const { result } = renderHook(() => useTickets(initialData));

    let reorderPromise!: Promise<void>;
    act(() => {
      reorderPromise = result.current.reorder(
        { ticketId: 1, status: 'TODO', position: 0 },
        optimisticBoard
      );
    });

    // API 응답을 기다리지 않고 board가 즉시 낙관적으로 반영된다.
    expect(result.current.board).toEqual(optimisticBoard);

    await act(async () => {
      await reorderPromise;
    });

    expect(mockedTicketApi.reorder).toHaveBeenCalledWith({
      ticketId: 1,
      status: 'TODO',
      position: 0,
    });
    // getBoard로 다시 불러오지 않는다 — 서버가 돌려준 ticket으로 확정.
    expect(mockedTicketApi.getBoard).not.toHaveBeenCalled();
    expect(result.current.board.TODO[0]).toEqual(confirmedTicket);
  });

  it('reorder 실패 시 낙관적으로 반영했던 board를 백업 상태로 롤백하고 error를 설정한다', async () => {
    const initialData = makeBoardWithOneTicket();
    const optimisticBoard = makeBoardWithOneTicket();
    optimisticBoard.BACKLOG = [];
    optimisticBoard.TODO = [{ ...initialData.BACKLOG[0], status: 'TODO' }];
    mockedTicketApi.reorder.mockRejectedValueOnce(
      new Error('티켓을 찾을 수 없습니다')
    );

    const { result } = renderHook(() => useTickets(initialData));

    await act(async () => {
      await result.current.reorder(
        { ticketId: 1, status: 'TODO', position: 0 },
        optimisticBoard
      );
    });

    expect(result.current.board).toEqual(initialData);
    expect(result.current.error).toBe('티켓을 찾을 수 없습니다');
  });

  it('complete: nextBoard를 즉시 반영(낙관적)한 뒤 ticketApi.complete를 호출하고, 성공하면 서버 응답으로 확정한다', async () => {
    const initialData = makeBoardWithOneTicket();
    const optimisticBoard = makeEmptyBoard();
    optimisticBoard.DONE = [{ ...initialData.BACKLOG[0], status: 'DONE' }];
    const confirmedTicket = { ...optimisticBoard.DONE[0], completedAt: new Date() };
    mockedTicketApi.complete.mockResolvedValueOnce(confirmedTicket as never);

    const { result } = renderHook(() => useTickets(initialData));

    let completePromise!: Promise<void>;
    act(() => {
      completePromise = result.current.complete(1, optimisticBoard);
    });

    expect(result.current.board).toEqual(optimisticBoard);

    await act(async () => {
      await completePromise;
    });

    expect(mockedTicketApi.complete).toHaveBeenCalledWith(1);
    expect(mockedTicketApi.getBoard).not.toHaveBeenCalled();
    expect(result.current.board.DONE[0]).toEqual(confirmedTicket);
  });

  it('complete 실패 시 낙관적으로 반영했던 board를 백업 상태로 롤백하고 error를 설정한다', async () => {
    const initialData = makeBoardWithOneTicket();
    const optimisticBoard = makeEmptyBoard();
    optimisticBoard.DONE = [{ ...initialData.BACKLOG[0], status: 'DONE' }];
    mockedTicketApi.complete.mockRejectedValueOnce(
      new Error('티켓을 찾을 수 없습니다')
    );

    const { result } = renderHook(() => useTickets(initialData));

    await act(async () => {
      await result.current.complete(1, optimisticBoard);
    });

    expect(result.current.board).toEqual(initialData);
    expect(result.current.error).toBe('티켓을 찾을 수 없습니다');
  });

  it('create 실패 시 error 상태를 설정하고 board는 이전 상태를 유지한다', async () => {
    const initialData = makeBoardWithOneTicket();
    mockedTicketApi.create.mockRejectedValueOnce(new Error('제목을 입력해주세요'));

    const { result } = renderHook(() => useTickets(initialData));

    await act(async () => {
      await result.current.create({ title: '' });
    });

    expect(result.current.error).toBe('제목을 입력해주세요');
    expect(result.current.board).toEqual(initialData);
    // 실패했으므로 board를 다시 불러올 필요가 없다.
    expect(mockedTicketApi.getBoard).not.toHaveBeenCalled();
  });

  it('remove 실패 시 error 상태를 설정하고 board는 이전 상태를 유지한다', async () => {
    const initialData = makeBoardWithOneTicket();
    mockedTicketApi.remove.mockRejectedValueOnce(
      new Error('티켓을 찾을 수 없습니다')
    );

    const { result } = renderHook(() => useTickets(initialData));

    await act(async () => {
      await result.current.remove(999);
    });

    expect(result.current.error).toBe('티켓을 찾을 수 없습니다');
    expect(result.current.board).toEqual(initialData);
    expect(mockedTicketApi.getBoard).not.toHaveBeenCalled();
  });

  it('API 호출 중에는 isLoading이 true다', async () => {
    const initialData = makeEmptyBoard();
    let resolveCreate!: (value: BoardData['BACKLOG'][number]) => void;
    mockedTicketApi.create.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = resolve;
      })
    );
    mockedTicketApi.getBoard.mockResolvedValueOnce({
      board: makeBoardWithOneTicket(),
      total: 1,
    });

    const { result } = renderHook(() => useTickets(initialData));

    let createPromise!: Promise<void>;
    act(() => {
      createPromise = result.current.create({ title: '새 티켓' });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      resolveCreate(makeBoardWithOneTicket().BACKLOG[0]);
      await createPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('실패한 API 호출도 끝나면 isLoading이 false로 돌아온다', async () => {
    const initialData = makeBoardWithOneTicket();
    mockedTicketApi.remove.mockRejectedValueOnce(
      new Error('티켓을 찾을 수 없습니다')
    );

    const { result } = renderHook(() => useTickets(initialData));

    await act(async () => {
      await result.current.remove(999);
    });

    expect(result.current.isLoading).toBe(false);
  });
});
