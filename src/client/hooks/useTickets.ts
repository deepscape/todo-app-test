// docs/FRONTEND_TASKS.md Phase 4.2 / Phase 6, docs/COMPONENT_SPEC.md §4.
// ticketApi를 감싸 board 상태와 CRUD 액션을 제공한다.
//
// create/update/remove: ticketApi 호출 성공 후 getBoard()로 board를
// 다시 불러와(refreshBoard) 서버 기준 최신 상태로 맞춘다. 이 세 액션은
// 매 프레임 반응성이 필요하지 않고, 서버가 계산하는 파생값을 그대로
// 반영하는 단순한 방식이 더 안전하다.
//
// reorder/complete: 드래그앤드롭은 즉시 반응해야 하므로 낙관적
// 업데이트를 적용한다 (docs/COMPONENT_SPEC.md §4: 백업 → UI 즉시 반영
// → API 호출 → 성공 시 서버 응답으로 확정 / 실패 시 롤백). 호출자
// (BoardContainer)가 dndHelpers로 계산한 nextBoard를 함께 넘기면, 이
// 훅은 그것을 즉시 반영하고 API 결과에 따라 확정하거나 되돌리는 역할만
// 맡는다 — position 계산 등 드래그 관련 로직은 이 훅에 두지 않는다.
'use client';

import { useCallback, useState } from 'react';
import { ticketApi } from '@/client/api/ticketApi';
import type { BoardData, TicketStatus } from '@/shared/types';
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
  reorder: (input: ReorderTicketInput, nextBoard: BoardData) => Promise<void>;
  complete: (id: number, nextBoard: BoardData) => Promise<void>;
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

  // 낙관적 업데이트 공통 흐름: 백업 → nextBoard 즉시 반영 → API 호출 →
  // 성공 시 서버가 돌려준 ticket으로 해당 티켓만 확정 → 실패 시 백업
  // 상태로 롤백 + error 설정.
  const runOptimistic = useCallback(
    async (
      nextBoard: BoardData,
      action: () => Promise<{ id: number; status: TicketStatus }>
    ) => {
      const backup = board;
      setIsLoading(true);
      setError(null);
      setBoard(nextBoard);
      try {
        const confirmedTicket = await action();
        setBoard((current) => ({
          ...current,
          [confirmedTicket.status]: current[confirmedTicket.status].map((t) =>
            t.id === confirmedTicket.id ? { ...t, ...confirmedTicket } : t
          ),
        }));
      } catch (err) {
        setBoard(backup);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [board]
  );

  const reorder = useCallback(
    (input: ReorderTicketInput, nextBoard: BoardData) =>
      runOptimistic(nextBoard, async () => {
        const { ticket } = await ticketApi.reorder(input);
        return ticket;
      }),
    [runOptimistic]
  );

  const complete = useCallback(
    (id: number, nextBoard: BoardData) =>
      runOptimistic(nextBoard, () => ticketApi.complete(id)),
    [runOptimistic]
  );

  return { board, isLoading, error, create, update, remove, reorder, complete };
}
