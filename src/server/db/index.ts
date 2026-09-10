// Drizzle 클라이언트 (postgres-js).
//
// docs/TRD.md §4.1은 @vercel/postgres 를 명시하나, 로컬 개발/테스트 DB(PostgreSQL 11,
// 비 Neon)와 호환되지 않아 postgres-js 드라이버로 대체한다. Neon 전환 시 재검토.
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.POSTGRES_URL!);

export const db = drizzle(client, { schema });
