// docs/FRONTEND_TASKS.md Phase 6.2. 서버 컴포넌트 — 초기 보드 데이터를
// 서버에서 직접 조회해(ticketService.getBoard, DB 접근) BoardContainer에
// initialData로 전달한다. 클라이언트에서 별도로 GET /api/tickets를 다시
// 호출하지 않아도 첫 렌더에 실제 데이터가 채워진다.
//
// force-dynamic: 이 페이지를 빌드 시점에 정적으로 굳히지 않고 매 요청
// 마다 새로 렌더링한다. 보드는 다른 사용자/다른 경로(드래그, API 직접
// 호출 등)로 계속 바뀌는 데이터라, 정적 프리렌더로 두면 빌드 시점의
// DB 스냅샷이 그대로 굳어버려 새로 방문하거나 새로고침한 사용자가
// 오래된 화면을 보게 된다.
export const dynamic = 'force-dynamic';

import { getBoard } from '@/server/services/ticketService';
import { BoardContainer } from '@/client/components/board/BoardContainer';

export default async function BoardPage() {
  const { board } = await getBoard();

  return <BoardContainer initialData={board} />;
}
