// PATCH /api/tickets/reorder — 순서/상태 변경 (FR-001~FR-011)
// Route Handler는 얇게 유지: 요청 파싱 → 검증 → 서비스 호출 → 응답.
import { NextResponse } from 'next/server';
import { reorderTicketSchema } from '@/shared/validations/ticket';
import { reorder } from '@/server/services/ticketService';

export async function PATCH(req: Request) {
  const json = await req.json();
  const parsed = reorderTicketSchema.safeParse(json);

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

  const result = await reorder(parsed.data);
  if (!result) {
    return NextResponse.json(
      {
        error: {
          code: 'TICKET_NOT_FOUND',
          message: '티켓을 찾을 수 없습니다',
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json(result, { status: 200 });
}
