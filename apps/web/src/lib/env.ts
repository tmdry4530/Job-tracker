/**
 * 환경변수 검증 및 타입 안전한 접근
 *
 * 서버 시작 시 필수 환경변수가 설정되어 있는지 확인합니다.
 * (Supabase → Railway PostgreSQL + Auth.js 마이그레이션)
 */

type EnvConfig = {
  // Database (Railway PostgreSQL)
  DATABASE_URL: string

  // Auth.js
  AUTH_SECRET: string

  // App
  NEXT_PUBLIC_APP_URL?: string

  // BYOK: 사용자 API 키 암호화 키 (base64 32바이트).
  // 선택 — 미설정 시 앱은 정상 부팅되고 AI(BYOK) 기능만 비활성화된다.
  // (실제 검증은 encryption.ts가 encrypt/decrypt 호출 시점에 수행)
  ENCRYPTION_KEY?: string

  // OAuth (선택)
  AUTH_GOOGLE_ID?: string
  AUTH_GOOGLE_SECRET?: string
  AUTH_KAKAO_ID?: string
  AUTH_KAKAO_SECRET?: string

  // Sentry (선택)
  NEXT_PUBLIC_SENTRY_DSN?: string
  SENTRY_ORG?: string
  SENTRY_PROJECT?: string
  SENTRY_AUTH_TOKEN?: string
}

type RequiredEnvKeys = 'DATABASE_URL' | 'AUTH_SECRET'

const requiredKeys: RequiredEnvKeys[] = ['DATABASE_URL', 'AUTH_SECRET']

function validateEnv(): EnvConfig {
  const missingKeys: string[] = []

  for (const key of requiredKeys) {
    if (!process.env[key]) {
      missingKeys.push(key)
    }
  }

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingKeys
        .map((k) => `  - ${k}`)
        .join('\n')}\n\nPlease check your .env file.`
    )
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    AUTH_SECRET: process.env.AUTH_SECRET!,

    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    AUTH_KAKAO_ID: process.env.AUTH_KAKAO_ID,
    AUTH_KAKAO_SECRET: process.env.AUTH_KAKAO_SECRET,

    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  }
}

// 환경변수 검증 (서버 시작 시 한 번만 실행)
let env: EnvConfig | null = null

export function getEnv(): EnvConfig {
  if (!env) {
    env = validateEnv()
  }
  return env
}

// 개별 환경변수 접근 헬퍼
export const envHelpers = {
  db: {
    get url() {
      return getEnv().DATABASE_URL
    },
  },
  auth: {
    get secret() {
      return getEnv().AUTH_SECRET
    },
  },
  app: {
    get url() {
      return getEnv().NEXT_PUBLIC_APP_URL
    },
  },
  // BYOK: 공유 LLM 키는 없다(사용자별 암호화 저장). 암호화 마스터 키는
  // encryption.ts가 process.env.ENCRYPTION_KEY를 직접 읽어 호출 시점에 검증한다.
  crypto: {
    get isConfigured() {
      return !!getEnv().ENCRYPTION_KEY
    },
  },
  sentry: {
    get dsn() {
      return getEnv().NEXT_PUBLIC_SENTRY_DSN
    },
    get isConfigured() {
      return !!getEnv().NEXT_PUBLIC_SENTRY_DSN
    },
  },
}

// 개발 환경에서 환경변수 상태 로깅
export function logEnvStatus() {
  if (process.env.NODE_ENV !== 'development') return

  const config = getEnv()
  console.log('\n📦 Environment Variables Status:')
  console.log('  ✅ Database: Configured')
  console.log('  ✅ Auth.js: Configured')
  console.log(
    `  ${config.ENCRYPTION_KEY ? '✅' : '⚠️'} Encryption (BYOK): ${config.ENCRYPTION_KEY ? 'Configured' : 'Not set — AI 기능 비활성'}`
  )
  console.log('  ℹ️  LLM: BYOK — 사용자별 키 (환경변수 아님)')
  console.log(
    `  ${config.NEXT_PUBLIC_SENTRY_DSN ? '✅' : '⚠️'} Sentry: ${config.NEXT_PUBLIC_SENTRY_DSN ? 'Configured' : 'Not configured'}`
  )
  console.log('')
}
