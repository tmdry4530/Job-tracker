/**
 * Drizzle DB 클라이언트 (node-postgres)
 *
 * Railway PostgreSQL에 연결. DATABASE_URL 환경변수 사용.
 * Next.js dev HMR에서 풀이 중복 생성되지 않도록 globalThis 싱글톤 사용.
 */
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.')
}

// Railway 내부 연결(.railway.internal)은 SSL 불필요, 공개 프록시는 SSL 필요.
const needsSsl =
  /sslmode=require/.test(connectionString) ||
  (!connectionString.includes('.railway.internal') &&
    !connectionString.includes('localhost'))

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
