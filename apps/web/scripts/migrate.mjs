/**
 * 배포용 마이그레이션 러너 (런타임, tsx 불필요한 순수 ESM)
 *
 * Railway 시작 명령에서 `node apps/web/scripts/migrate.mjs` 로 실행.
 * 1) drizzle 테이블 마이그레이션 적용  2) triggers.sql 적용
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsFolder = join(here, '..', 'drizzle')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL 환경변수가 필요합니다.')
  process.exit(1)
}

const needsSsl =
  /sslmode=require/.test(connectionString) ||
  (!connectionString.includes('.railway.internal') &&
    !connectionString.includes('localhost'))

const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  max: 1,
})

try {
  const db = drizzle(pool)
  console.log('▶ 테이블 마이그레이션 적용 중...')
  await migrate(db, { migrationsFolder })

  console.log('▶ 트리거/함수 적용 중...')
  const triggersSql = readFileSync(join(migrationsFolder, 'triggers.sql'), 'utf-8')
  await pool.query(triggersSql)

  console.log('✅ 마이그레이션 완료')
  await pool.end()
  // 남은 핸들로 프로세스가 매달려 다음 명령(next start)이 실행되지 않는 것을 방지
  process.exit(0)
} catch (err) {
  console.error('❌ 마이그레이션 실패:', err)
  await pool.end()
  process.exit(1)
}
