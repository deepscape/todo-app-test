// API 호출 레이어 (docs/API_SPEC.md, CLAUDE.md API 호출 패턴).
// 컴포넌트/훅이 fetch를 직접 호출하지 않고 이 모듈을 거치도록 강제한다
// — 엔드포인트 URL/메서드/에러 처리가 한 곳에만 존재하게 하기 위함.
import type { BoardData, Ticket } from '@/shared/types';
import type {
  CreateTicketInput,
  UpdateTicketInput,
  ReorderTicketInput,
} from '@/shared/validations/ticket';

interface ApiErrorBody {
  error?: { code: string; message: string };
}

interface GetBoardResponse {
  board: BoardData;
  total: number;
}

interface ReorderResponse {
  ticket: Ticket;
  affected: { id: number; position: number }[];
}

// 실패 응답(!res.ok)에서 { error: { code, message } } 형식을 그대로
// 꺼내 Error로 던진다 (CLAUDE.md API 호출 패턴, docs/API_SPEC.md 공통
// 에러 응답 형식).
async function throwIfError(res: Response): Promise<void> {
  if (res.ok) return;
  const body: ApiErrorBody = await res.json();
  throw new Error(body.error?.message ?? 'Unknown error');
}

export const ticketApi = {
  async getBoard(): Promise<GetBoardResponse> {
    const res = await fetch('/api/tickets', undefined);
    await throwIfError(res);
    return res.json();
  },

  async create(input: CreateTicketInput): Promise<Ticket> {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    await throwIfError(res);
    return res.json();
  },

  async update(id: number, input: UpdateTicketInput): Promise<Ticket> {
    const res = await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    await throwIfError(res);
    return res.json();
  },

  async remove(id: number): Promise<void> {
    const res = await fetch(`/api/tickets/${id}`, {
      method: 'DELETE',
    });
    await throwIfError(res);
  },

  async reorder(input: ReorderTicketInput): Promise<ReorderResponse> {
    const res = await fetch('/api/tickets/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    await throwIfError(res);
    return res.json();
  },

  async complete(id: number): Promise<Ticket> {
    const res = await fetch(`/api/tickets/${id}/complete`, {
      method: 'PATCH',
    });
    await throwIfError(res);
    return res.json();
  },
};
