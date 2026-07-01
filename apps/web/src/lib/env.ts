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

  // OAuth (선택)
  AUTH_GOOGLE_ID?: string
  AUTH_GOOGLE_SECRET?: string
  AUTH_KAKAO_ID?: string
  AUTH_KAKAO_SECRET?: string

  // LLM — GLM (Z.ai Anthropic 호환 엔드포인트) (선택)
  GLM_API_KEY?: string
  GLM_MODEL?: string
  GLM_BASE_URL?: string

  // Sentry (선택)
  NEXT_PUBLIC_SENTRY_DSN?: string
  SENTRY_ORG?: string
  SENTRY_PROJECT?: string
  SENTRY_AUTH_TOKEN?: string

  // Toss Payments (선택)
  NEXT_PUBLIC_TOSS_CLIENT_KEY?: string
  TOSS_SECRET_KEY?: string
  TOSS_WEBHOOK_SECRET?: string
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
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    AUTH_KAKAO_ID: process.env.AUTH_KAKAO_ID,
    AUTH_KAKAO_SECRET: process.env.AUTH_KAKAO_SECRET,

    GLM_API_KEY: process.env.GLM_API_KEY,
    GLM_MODEL: process.env.GLM_MODEL,
    GLM_BASE_URL: process.env.GLM_BASE_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    NEXT_PUBLIC_TOSS_CLIENT_KEY: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY,
    TOSS_SECRET_KEY: process.env.TOSS_SECRET_KEY,
    TOSS_WEBHOOK_SECRET: process.env.TOSS_WEBHOOK_SECRET,
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
  llm: {
    get apiKey() {
      return getEnv().GLM_API_KEY
    },
    // 모델 ID 오버라이드(선택). 미설정 시 호출부 기본값(glm-4.6) 사용
    get model() {
      return getEnv().GLM_MODEL
    },
    // Anthropic 호환 엔드포인트 오버라이드(선택). 미설정 시 Z.ai 기본값 사용
    get baseUrl() {
      return getEnv().GLM_BASE_URL
    },
    get isConfigured() {
      return !!getEnv().GLM_API_KEY
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
  toss: {
    get clientKey() {
      return getEnv().NEXT_PUBLIC_TOSS_CLIENT_KEY
    },
    get secretKey() {
      return getEnv().TOSS_SECRET_KEY
    },
    get isConfigured() {
      return !!getEnv().NEXT_PUBLIC_TOSS_CLIENT_KEY && !!getEnv().TOSS_SECRET_KEY
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
    `  ${config.GLM_API_KEY ? '✅' : '⚠️'} LLM (GLM): ${config.GLM_API_KEY ? 'Configured' : 'Not configured'}`
  )
  console.log(
    `  ${config.NEXT_PUBLIC_SENTRY_DSN ? '✅' : '⚠️'} Sentry: ${config.NEXT_PUBLIC_SENTRY_DSN ? 'Configured' : 'Not configured'}`
  )
  console.log(
    `  ${envHelpers.toss.isConfigured ? '✅' : '⚠️'} Toss Payments: ${envHelpers.toss.isConfigured ? 'Configured' : 'Not configured'}`
  )
  console.log('')
}
