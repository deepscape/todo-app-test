// Drizzle 클라이언트 (postgres-js).
//
// docs/TRD.md §4.1은 @vercel/postgres 를 명시하나, 로컬 개발/테스트 DB(PostgreSQL 11,
// 비 Neon)와 호환되지 않아 postgres-js 드라이버로 대체한다. Neon 전환 시 재검토.
//
// 연결 문자열 폴백: POSTGRES_URL(Vercel이 Neon과 연동할 때 자동 생성) →
// DATABASE_URL(로컬 .env.local). 두 환경 모두 같은 코드로 동작하게
// 하기 위함.
//
// 지연 초기화: 모듈을 import하는 시점에 곧바로 커넥션을 만들지 않는다.
// 그러면 `npm run build`처럼 이 모듈을 거치기만 하고 실제 쿼리는 하지
// 않는 상황(타입 체크, 번들링, 정적 페이지 생성 등)에서도 연결
// 문자열이 없다는 이유로 빌드가 즉시 깨지지 않는다 — 커넥션은 실제로
// 첫 쿼리가 실행되는 시점에야 만들어지고, 그때 연결 문자열이 없으면
// 그 시점에 에러가 난다.
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Db = ReturnType<typeof drizzle<typeof schema>>;

let instance: Db | undefined;

function getDb(): Db {
  if (!instance) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DB 연결 문자열이 없습니다. POSTGRES_URL 또는 DATABASE_URL 환경 변수를 설정해주세요.'
      );
    }
    const client = postgres(connectionString);
    instance = drizzle(client, { schema });
  }
  return instance;
}

// db.select()/db.insert() 등 실제 메서드가 호출되는 시점에야 getDb()가
// 실행되어 커넥션이 만들어진다 — export되는 시점(모듈 로드 시점)에는
// 아무 연결도 시도하지 않는다.
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
