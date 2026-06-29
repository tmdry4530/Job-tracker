/**
 * DB 마이그레이션 러너
 *
 * 1) drizzle-kit이 생성한 테이블 마이그레이션 적용 (./drizzle)
 * 2) 트리거/함수(triggers.sql) 적용
 *
 * 로컬: `pnpm --filter web db:migrate` (DATABASE_URL=공개 프록시 URL)
 * 배포: Railway 빌드/릴리스 단계에서 실행 (DATABASE_URL=내부 URL)
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL 환경변수가 필요합니다.')
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

  const db = drizzle(pool)
  const migrationsFolder = join(process.cwd(), 'drizzle')

  console.log('▶ 테이블 마이그레이션 적용 중...')
  await migrate(db, { migrationsFolder })

  console.log('▶ 트리거/함수 적용 중...')
  const triggersSql = readFileSync(join(migrationsFolder, 'triggers.sql'), 'utf-8')
  await pool.query(triggersSql)

  console.log('✅ 마이그레이션 완료')
  await pool.end()
}

main().catch((err) => {
  console.error('❌ 마이그레이션 실패:', err)
  process.exit(1)
})
