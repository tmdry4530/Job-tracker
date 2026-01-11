/**
 * 환경변수 검증 및 타입 안전한 접근
 *
 * 서버 시작 시 필수 환경변수가 설정되어 있는지 확인합니다.
 */

type EnvConfig = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string

  // App
  NEXT_PUBLIC_APP_URL: string

  // Claude API (선택)
  CLAUDE_API_KEY?: string

  // Sentry (선택)
  NEXT_PUBLIC_SENTRY_DSN?: string
  SENTRY_ORG?: string
  SENTRY_PROJECT?: string
  SENTRY_AUTH_TOKEN?: string
}

type RequiredEnvKeys = 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY' | 'NEXT_PUBLIC_APP_URL'

const requiredKeys: RequiredEnvKeys[] = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
]

function validateEnv(): EnvConfig {
  const missingKeys: string[] = []

  for (const key of requiredKeys) {
    if (!process.env[key]) {
      missingKeys.push(key)
    }
  }

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingKeys.map((k) => `  - ${k}`).join('\n')}\n\nPlease check your .env.local file.`
    )
  }

  return {
    // 필수 환경변수
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,

    // 선택 환경변수
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
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
  supabase: {
    get url() {
      return getEnv().NEXT_PUBLIC_SUPABASE_URL
    },
    get anonKey() {
      return getEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY
    },
  },
  app: {
    get url() {
      return getEnv().NEXT_PUBLIC_APP_URL
    },
  },
  claude: {
    get apiKey() {
      return getEnv().CLAUDE_API_KEY
    },
    get isConfigured() {
      return !!getEnv().CLAUDE_API_KEY
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
  console.log('  ✅ Supabase: Configured')
  console.log(`  ${config.CLAUDE_API_KEY ? '✅' : '⚠️'} Claude API: ${config.CLAUDE_API_KEY ? 'Configured' : 'Not configured'}`)
  console.log(`  ${config.NEXT_PUBLIC_SENTRY_DSN ? '✅' : '⚠️'} Sentry: ${config.NEXT_PUBLIC_SENTRY_DSN ? 'Configured' : 'Not configured'}`)
  console.log('')
}
