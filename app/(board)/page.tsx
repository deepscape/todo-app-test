// docs/FRONTEND_TASKS.md Phase 6.2. 서버 컴포넌트 — 초기 보드 데이터를
// 서버에서 직접 조회해(ticketService.getBoard, DB 접근) BoardContainer에
// initialData로 전달한다. 클라이언트에서 별도로 GET /api/tickets를 다시
// 호출하지 않아도 첫 렌더에 실제 데이터가 채워진다.
import { getBoard } from '@/server/services/ticketService';
import { BoardContainer } from '@/client/components/board/BoardContainer';

export default async function BoardPage() {
  const { board } = await getBoard();

  return <BoardContainer initialData={board} />;
}
