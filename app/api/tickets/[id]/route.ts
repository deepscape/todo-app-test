// GET /api/tickets/:id — 상세 조회 (FR-001, FR-002)
// PATCH /api/tickets/:id — 부분 수정 (FR-003~FR-008)
// DELETE /api/tickets/:id — 영구 삭제 (FR-009, FR-010)
// Route Handler는 얇게 유지: id 파싱/검증 → 서비스 호출 → 응답.
import { NextResponse } from 'next/server';
import { getById, remove, update } from '@/server/services/ticketService';
import { updateTicketSchema } from '@/shared/validations/ticket';

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

// path parameter는 Zod 검증 대상(요청 바디/쿼리)이 아니므로 간단한 타입
// 가드로 처리한다 (research.md Decision 1).
function parseTicketId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(req: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = parseTicketId(rawId);
  if (id === null) {
    return NextResponse.json(INVALID_ID_ERROR, { status: 400 });
  }

  const ticket = await getById(id);
  if (!ticket) {
    return NextResponse.json(NOT_FOUND_ERROR, { status: 404 });
  }

  return NextResponse.json(ticket, { status: 200 });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = parseTicketId(rawId);
  if (id === null) {
    return NextResponse.json(INVALID_ID_ERROR, { status: 400 });
  }

  const json = await req.json();
  const parsed = updateTicketSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      },
      { status: 400 }
    );
  }

  const ticket = await update(id, parsed.data);
  if (!ticket) {
    return NextResponse.json(NOT_FOUND_ERROR, { status: 404 });
  }

  return NextResponse.json(ticket, { status: 200 });
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = parseTicketId(rawId);
  if (id === null) {
    return NextResponse.json(INVALID_ID_ERROR, { status: 400 });
  }

  const deleted = await remove(id);
  if (!deleted) {
    return NextResponse.json(NOT_FOUND_ERROR, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
