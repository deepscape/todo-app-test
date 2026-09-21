/**
 * ticketApi 모듈 테스트 (TDD Red)
 *
 * 스펙: docs/API_SPEC.md (엔드포인트별 메서드/URL/요청/응답 형식),
 * docs/FRONTEND_TASKS.md Phase 4.1, CLAUDE.md API 호출 패턴
 * (에러 시 error.error.message throw).
 * 대상: src/client/api/ticketApi.ts (아직 미구현)
 *
 * jest.fn()으로 global.fetch를 mock해 실제 네트워크 없이 각 함수가
 * 올바른 메서드/URL/body로 호출하는지, 성공 시 응답 body를 그대로
 * 반환하는지, 실패 시(!res.ok) error.error.message를 담은 Error를
 * throw하는지 검증한다.
 */

import { ticketApi } from '../../src/client/api/ticketApi';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function mockFetchOnce(response: {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}) {
  mockFetch.mockResolvedValueOnce(response);
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('ticketApi', () => {
  describe('getBoard', () => {
    it('GET /api/tickets로 호출한다', async () => {
      const body = { board: { BACKLOG: [], TODO: [], IN_PROGRESS: [], DONE: [] }, total: 0 };
      mockFetchOnce({ ok: true, json: async () => body });

      await ticketApi.getBoard();

      expect(mockFetch).toHaveBeenCalledWith('/api/tickets', undefined);
    });

    it('성공 시 응답 body를 그대로 반환한다', async () => {
      const body = { board: { BACKLOG: [], TODO: [], IN_PROGRESS: [], DONE: [] }, total: 0 };
      mockFetchOnce({ ok: true, json: async () => body });

      const result = await ticketApi.getBoard();

      expect(result).toEqual(body);
    });

    it('에러 응답 시 error.error.message를 담은 Error를 throw한다', async () => {
      mockFetchOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { code: 'INTERNAL_ERROR', message: '서버 오류' } }),
      });

      await expect(ticketApi.getBoard()).rejects.toThrow('서버 오류');
    });
  });

  describe('create', () => {
    const input = { title: '새 티켓', priority: 'HIGH' as const };

    it('POST /api/tickets로, JSON body와 함께 호출한다', async () => {
      mockFetchOnce({ ok: true, status: 201, json: async () => ({ id: 1, ...input }) });

      await ticketApi.create(input);

      expect(mockFetch).toHaveBeenCalledWith('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    });

    it('성공 시 생성된 티켓을 반환한다', async () => {
      const created = { id: 1, title: '새 티켓' };
      mockFetchOnce({ ok: true, status: 201, json: async () => created });

      const result = await ticketApi.create(input);

      expect(result).toEqual(created);
    });

    it('에러 응답 시 error.error.message를 담은 Error를 throw한다', async () => {
      mockFetchOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'VALIDATION_ERROR', message: '제목을 입력해주세요' } }),
      });

      await expect(ticketApi.create(input)).rejects.toThrow('제목을 입력해주세요');
    });
  });

  describe('update', () => {
    const input = { title: '수정된 제목' };

    it('PATCH /api/tickets/:id로, JSON body와 함께 호출한다', async () => {
      mockFetchOnce({ ok: true, json: async () => ({ id: 5, ...input }) });

      await ticketApi.update(5, input);

      expect(mockFetch).toHaveBeenCalledWith('/api/tickets/5', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    });

    it('성공 시 수정된 티켓을 반환한다', async () => {
      const updated = { id: 5, title: '수정된 제목' };
      mockFetchOnce({ ok: true, json: async () => updated });

      const result = await ticketApi.update(5, input);

      expect(result).toEqual(updated);
    });

    it('에러 응답 시 error.error.message를 담은 Error를 throw한다', async () => {
      mockFetchOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { code: 'TICKET_NOT_FOUND', message: '티켓을 찾을 수 없습니다' } }),
      });

      await expect(ticketApi.update(999, input)).rejects.toThrow('티켓을 찾을 수 없습니다');
    });
  });

  describe('remove', () => {
    it('DELETE /api/tickets/:id로 호출한다', async () => {
      mockFetchOnce({ ok: true, status: 204, json: async () => null });

      await ticketApi.remove(5);

      expect(mockFetch).toHaveBeenCalledWith('/api/tickets/5', {
        method: 'DELETE',
      });
    });

    it('성공 시 별다른 에러 없이 완료된다(204 No Content)', async () => {
      mockFetchOnce({ ok: true, status: 204, json: async () => null });

      await expect(ticketApi.remove(5)).resolves.not.toThrow();
    });

    it('에러 응답 시 error.error.message를 담은 Error를 throw한다', async () => {
      mockFetchOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { code: 'TICKET_NOT_FOUND', message: '티켓을 찾을 수 없습니다' } }),
      });

      await expect(ticketApi.remove(999)).rejects.toThrow('티켓을 찾을 수 없습니다');
    });
  });

  describe('reorder', () => {
    const input = { ticketId: 3, status: 'IN_PROGRESS' as const, position: 0 };

    it('PATCH /api/tickets/reorder로, JSON body와 함께 호출한다', async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({ ticket: { id: 3 }, affected: [] }),
      });

      await ticketApi.reorder(input);

      expect(mockFetch).toHaveBeenCalledWith('/api/tickets/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    });

    it('성공 시 ticket과 affected를 담은 응답을 그대로 반환한다', async () => {
      const body = { ticket: { id: 3, position: 0 }, affected: [{ id: 5, position: 1024 }] };
      mockFetchOnce({ ok: true, json: async () => body });

      const result = await ticketApi.reorder(input);

      expect(result).toEqual(body);
    });

    it('에러 응답 시 error.error.message를 담은 Error를 throw한다', async () => {
      mockFetchOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { code: 'VALIDATION_ERROR', message: '상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요' },
        }),
      });

      await expect(ticketApi.reorder(input)).rejects.toThrow(
        '상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요'
      );
    });
  });

  describe('complete', () => {
    it('PATCH /api/tickets/:id/complete로, body 없이 호출한다', async () => {
      mockFetchOnce({ ok: true, json: async () => ({ id: 3, status: 'DONE' }) });

      await ticketApi.complete(3);

      expect(mockFetch).toHaveBeenCalledWith('/api/tickets/3/complete', {
        method: 'PATCH',
      });
    });

    it('성공 시 완료 처리된 티켓을 반환한다', async () => {
      const completed = { id: 3, status: 'DONE', completedAt: '2026-09-21T00:00:00.000Z' };
      mockFetchOnce({ ok: true, json: async () => completed });

      const result = await ticketApi.complete(3);

      expect(result).toEqual(completed);
    });

    it('에러 응답 시 error.error.message를 담은 Error를 throw한다', async () => {
      mockFetchOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { code: 'TICKET_NOT_FOUND', message: '티켓을 찾을 수 없습니다' } }),
      });

      await expect(ticketApi.complete(999)).rejects.toThrow('티켓을 찾을 수 없습니다');
    });
  });
});
