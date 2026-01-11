/**
 * Extension 환경변수 검증 및 타입 안전한 접근
 */

type ExtensionEnvConfig = {
  PLASMO_PUBLIC_SUPABASE_URL: string
  PLASMO_PUBLIC_SUPABASE_ANON_KEY: string
  PLASMO_PUBLIC_DASHBOARD_URL: string
}

const requiredKeys: (keyof ExtensionEnvConfig)[] = [
  'PLASMO_PUBLIC_SUPABASE_URL',
  'PLASMO_PUBLIC_SUPABASE_ANON_KEY',
  'PLASMO_PUBLIC_DASHBOARD_URL',
]

function validateEnv(): ExtensionEnvConfig {
  const missingKeys: string[] = []

  for (const key of requiredKeys) {
    if (!process.env[key]) {
      missingKeys.push(key)
    }
  }

  if (missingKeys.length > 0) {
    console.error(
      `[Extension] Missing required environment variables:\n${missingKeys.map((k) => `  - ${k}`).join('\n')}`
    )
  }

  return {
    PLASMO_PUBLIC_SUPABASE_URL: process.env.PLASMO_PUBLIC_SUPABASE_URL || '',
    PLASMO_PUBLIC_SUPABASE_ANON_KEY: process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY || '',
    PLASMO_PUBLIC_DASHBOARD_URL: process.env.PLASMO_PUBLIC_DASHBOARD_URL || 'http://localhost:3000',
  }
}

// 환경변수 캐시
let env: ExtensionEnvConfig | null = null

export function getExtensionEnv(): ExtensionEnvConfig {
  if (!env) {
    env = validateEnv()
  }
  return env
}

// 헬퍼 함수들
export const extensionEnv = {
  supabase: {
    get url() {
      return getExtensionEnv().PLASMO_PUBLIC_SUPABASE_URL
    },
    get anonKey() {
      return getExtensionEnv().PLASMO_PUBLIC_SUPABASE_ANON_KEY
    },
    get isConfigured() {
      const e = getExtensionEnv()
      return !!(e.PLASMO_PUBLIC_SUPABASE_URL && e.PLASMO_PUBLIC_SUPABASE_ANON_KEY)
    },
  },
  dashboard: {
    get url() {
      return getExtensionEnv().PLASMO_PUBLIC_DASHBOARD_URL
    },
  },
}
