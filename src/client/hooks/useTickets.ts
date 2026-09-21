// docs/FRONTEND_TASKS.md Phase 4.2 useTickets. ticketApi를 감싸 board
// 상태와 CRUD 액션을 제공한다. 각 액션은 ticketApi 호출 성공 후
// getBoard()로 board를 다시 불러와(refreshBoard) 서버 기준 최신 상태로
// 맞춘다 — 낙관적 업데이트 대신, 매 액션마다 서버가 계산하는 파생값
// (position 재배치, isOverdue, startedAt/completedAt 자동 설정 등)을
// 그대로 반영하는 단순한 방식을 택했다.
'use client';

import { useCallback, useState } from 'react';
import { ticketApi } from '@/client/api/ticketApi';
import type { BoardData } from '@/shared/types';
import type {
  CreateTicketInput,
  UpdateTicketInput,
  ReorderTicketInput,
} from '@/shared/validations/ticket';

export interface UseTicketsReturn {
  board: BoardData;
  isLoading: boolean;
  error: string | null;
  create: (input: CreateTicketInput) => Promise<void>;
  update: (id: number, input: UpdateTicketInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
  reorder: (input: ReorderTicketInput) => Promise<void>;
  complete: (id: number) => Promise<void>;
}

export function useTickets(initialData: BoardData): UseTicketsReturn {
  const [board, setBoard] = useState<BoardData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBoard = useCallback(async () => {
    const { board: nextBoard } = await ticketApi.getBoard();
    setBoard(nextBoard);
  }, []);

  // 액션 함수마다 반복되는 "로딩 시작 → 호출 → 성공 시 refresh → 실패 시
  // error 설정 → 로딩 종료" 흐름을 여기 한 곳으로 모은다.
  const run = useCallback(
    async (action: () => Promise<void>) => {
      setIsLoading(true);
      setError(null);
      try {
        await action();
        await refreshBoard();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [refreshBoard]
  );

  const create = useCallback(
    (input: CreateTicketInput) =>
      run(async () => {
        await ticketApi.create(input);
      }),
    [run]
  );

  const update = useCallback(
    (id: number, input: UpdateTicketInput) =>
      run(async () => {
        await ticketApi.update(id, input);
      }),
    [run]
  );

  const remove = useCallback(
    (id: number) =>
      run(async () => {
        await ticketApi.remove(id);
      }),
    [run]
  );

  const reorder = useCallback(
    (input: ReorderTicketInput) =>
      run(async () => {
        await ticketApi.reorder(input);
      }),
    [run]
  );

  const complete = useCallback(
    (id: number) =>
      run(async () => {
        await ticketApi.complete(id);
      }),
    [run]
  );

  return { board, isLoading, error, create, update, remove, reorder, complete };
}
