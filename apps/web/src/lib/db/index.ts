/**
 * Drizzle DB 클라이언트 (node-postgres)
 *
 * Railway PostgreSQL에 연결. DATABASE_URL 환경변수 사용.
 * - import 시점에는 throw하지 않는다(빌드 단계에서 DATABASE_URL이 없어도 안전).
 *   풀은 첫 쿼리 시점에 실제 연결을 맺으며, 그때 DATABASE_URL이 없으면 pg가 에러를 낸다.
 * - Next.js dev HMR에서 풀이 중복 생성되지 않도록 globalThis 싱글톤 사용.
 */
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

// Railway 내부 연결(.railway.internal)은 SSL 불필요, 공개 프록시는 SSL 필요.
const needsSsl = connectionString
  ? /sslmode=require/.test(connectionString) ||
    (!connectionString.includes('.railway.internal') &&
      !connectionString.includes('localhost'))
  : false

const globalForDb = globalThis as unknown as {
  __dbPool?: Pool
}

const pool =
  globalForDb.__dbPool ??
  new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__dbPool = pool
}

export const db = drizzle(pool, { schema })

export { schema }
export type DB = typeof db
