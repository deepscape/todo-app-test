// POST /api/tickets — 티켓 생성 (FR-001)
// GET /api/tickets — 보드 조회 (FR-002, FR-008)
// Route Handler는 얇게 유지: 요청 파싱 → 검증 → 서비스 호출 → 응답.
import { NextResponse } from 'next/server';
import { createTicketSchema } from '@/shared/validations/ticket';
import { create, getBoard } from '@/server/services/ticketService';

export async function GET() {
  const result = await getBoard();
  return NextResponse.json(result, { status: 200 });
}

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = createTicketSchema.safeParse(json);

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

  const ticket = await create(parsed.data);
  return NextResponse.json(ticket, { status: 201 });
}
