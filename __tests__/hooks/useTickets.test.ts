/**
 * useTickets Hook 테스트 (TDD Red)
 *
 * 역할: ticketApi를 감싸서 board 상태 관리 + CRUD 제공.
 * 반환: { board, isLoading, error, create, update, remove, reorder, complete }
 * 패턴: 각 액션은 ticketApi 호출 성공 후 getBoard()로 board를 다시
 * 불러와(refreshBoard) 최신 상태로 갱신한다. 실패 시 error 상태를
 * 설정하고, board는 이전 상태를 유지한다(추가로 되돌릴 낙관적 변경이
 * 없으므로 롤백이 아니라 단순 유지).
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

  it('reorder: ticketApi.reorder 호출 후 getBoard로 board를 갱신한다', async () => {
    const initialData = makeBoardWithOneTicket();
    const refreshedBoard = makeBoardWithOneTicket();
    refreshedBoard.BACKLOG[0].status = 'TODO';
    mockedTicketApi.reorder.mockResolvedValueOnce({
      ticket: refreshedBoard.BACKLOG[0] as never,
      affected: [],
    });
    mockedTicketApi.getBoard.mockResolvedValueOnce({
      board: refreshedBoard,
      total: 1,
    });

    const { result } = renderHook(() => useTickets(initialData));

    await act(async () => {
      await result.current.reorder({
        ticketId: 1,
        status: 'TODO',
        position: 0,
      });
    });

    expect(mockedTicketApi.reorder).toHaveBeenCalledWith({
      ticketId: 1,
      status: 'TODO',
      position: 0,
    });
    expect(mockedTicketApi.getBoard).toHaveBeenCalledTimes(1);
    expect(result.current.board).toEqual(refreshedBoard);
  });

  it('complete: ticketApi.complete 호출 후 getBoard로 board를 갱신한다', async () => {
    const initialData = makeBoardWithOneTicket();
    const refreshedBoard = makeEmptyBoard();
    refreshedBoard.DONE = [{ ...initialData.BACKLOG[0], status: 'DONE' }];
    mockedTicketApi.complete.mockResolvedValueOnce(
      refreshedBoard.DONE[0] as never
    );
    mockedTicketApi.getBoard.mockResolvedValueOnce({
      board: refreshedBoard,
      total: 1,
    });

    const { result } = renderHook(() => useTickets(initialData));

    await act(async () => {
      await result.current.complete(1);
    });

    expect(mockedTicketApi.complete).toHaveBeenCalledWith(1);
    expect(mockedTicketApi.getBoard).toHaveBeenCalledTimes(1);
    expect(result.current.board).toEqual(refreshedBoard);
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
