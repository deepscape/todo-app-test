// PATCH /api/tickets/:id/complete — 완료 처리 (FR-001~FR-003, FR-005, FR-006)
// Route Handler는 얇게 유지: id 파싱/검증 → 서비스 호출 → 응답.
import { NextResponse } from 'next/server';
import { complete } from '@/server/services/ticketService';

type RouteContext = { params: Promise<{ id: string }> };

const INVALID_ID_ERROR = {
  error: {
    code: 'VALIDATION_ERROR',
    message: '잘못된 티켓 id입니다',
  },
} as const;

const NOT_FOUND_ERROR = {
  error: {
    code: 'TICKET_NOT_FOUND',
    message: '티켓을 찾을 수 없습니다',
  },
} as const;

// path parameter는 Zod 검증 대상이 아니므로 간단한 타입 가드로 처리한다
// (002-ticket-detail-crud research.md Decision 1과 동일 패턴).
function parseTicketId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = parseTicketId(rawId);
  if (id === null) {
    return NextResponse.json(INVALID_ID_ERROR, { status: 400 });
  }

  const ticket = await complete(id);
  if (!ticket) {
    return NextResponse.json(NOT_FOUND_ERROR, { status: 404 });
  }

  return NextResponse.json(ticket, { status: 200 });
}
