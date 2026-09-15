/**
 * 테스트용 DB 헬퍼.
 *
 * API 통합 테스트는 실제 `tika_test` DB를 사용한다 (next/jest 가 .env.test 를
 * 자동 로드하여 POSTGRES_URL 을 tika_test 로 설정).
 *
 * NOTE: `src/server/db` (postgres-js 기반 Drizzle 클라이언트) 는 아직 구현되지
 * 않았다. 아래 함수들은 호출 시점에 동적 import 하므로, 모듈이 없으면 그 함수를
 * 호출한 테스트가 개별적으로 실패한다 (TDD Red — 스위트 전체가 죽지 않음).
 */
import { eq, sql } from 'drizzle-orm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDb(): Promise<any> {
  const mod = await import('../../../src/server/db');
  return mod.db;
}

/**
 * 테스트 전용: 티켓을 DONE으로 바꾸고 completedAt을 임의 시각으로 설정한다.
 * PATCH /api/tickets/:id/complete는 항상 "현재 시각"만 기록하므로, 24시간
 * 경계를 검증하려면 DB에 직접 과거 시각을 넣어야 한다 (quickstart.md 참조).
 */
export async function setCompletedAt(
  ticketId: number,
  completedAt: Date
): Promise<void> {
  const db = await getDb();
  const { tickets } = await import('../../../src/server/db/schema');
  await db
    .update(tickets)
    .set({ status: 'DONE', completedAt })
    .where(eq(tickets.id, ticketId));
}

/**
 * 테스트 전용: dueDate를 임의 값(과거 포함)으로 직접 설정한다.
 * POST /api/tickets는 과거 dueDate를 거부하므로(Zod 검증), 기한 초과
 * 케이스를 준비하려면 DB에 직접 써야 한다.
 */
export async function setDueDate(
  ticketId: number,
  dueDate: string
): Promise<void> {
  const db = await getDb();
  const { tickets } = await import('../../../src/server/db/schema');
  await db.update(tickets).set({ dueDate }).where(eq(tickets.id, ticketId));
}

/** 각 테스트 전에 tickets 테이블을 비우고 serial id 를 초기화한다. */
export async function truncateTickets(): Promise<void> {
  const db = await getDb();
  await db.execute(sql`TRUNCATE TABLE tickets RESTART IDENTITY CASCADE`);
}

/** 모든 테스트 종료 후 DB 연결을 정리한다. */
export async function closeDb(): Promise<void> {
  let db: unknown;
  try {
    db = await getDb();
  } catch {
    return; // 모듈 자체가 없으면 정리할 연결도 없음
  }
  // postgres-js 클라이언트 종료. 드라이버 구현 시 정확한 형태 확정
  // (예: db.$client.end()).
  const client = (db as { $client?: { end?: () => Promise<void> } }).$client;
  if (client?.end) {
    await client.end();
  }
}
