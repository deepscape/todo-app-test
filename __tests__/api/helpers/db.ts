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
import { sql } from 'drizzle-orm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDb(): Promise<any> {
  const mod = await import('../../../src/server/db');
  return mod.db;
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
