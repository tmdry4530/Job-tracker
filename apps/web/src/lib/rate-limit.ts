/**
 * In-memory Rate Limiter
 * 사용자별 API 호출 제한을 위한 간단한 rate limiting 구현
 *
 * 프로덕션에서는 Redis 기반 rate limiter (예: @upstash/ratelimit) 권장
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// 메모리 기반 저장소 (서버 재시작 시 초기화됨)
const rateLimitStore = new Map<string, RateLimitEntry>()

// 주기적으로 만료된 엔트리 정리 (메모리 누수 방지)
const CLEANUP_INTERVAL = 60 * 1000 // 1분
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

export interface RateLimitConfig {
  /** 시간 윈도우 내 최대 요청 수 */
  limit: number
  /** 시간 윈도우 (밀리초) */
  windowMs: number
}

export interface RateLimitResult {
  /** 요청 허용 여부 */
  success: boolean
  /** 남은 요청 수 */
  remaining: number
  /** 제한 리셋까지 남은 시간 (밀리초) */
  resetIn: number
}

/**
 * Rate limit 체크
 * @param identifier - 사용자 식별자 (user_id, IP 등)
 * @param config - Rate limit 설정
 * @returns RateLimitResult
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const key = identifier
  const entry = rateLimitStore.get(key)

  // 새 윈도우 시작 또는 첫 요청
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })

    return {
      success: true,
      remaining: config.limit - 1,
      resetIn: config.windowMs,
    }
  }

  // 기존 윈도우 내 요청
  const resetIn = entry.resetAt - now

  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetIn,
    }
  }

  entry.count++

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetIn,
  }
}

/**
 * API별 기본 rate limit 설정
 */
export const RATE_LIMITS = {
  /** AI 요약 생성 - 분당 5회 */
  AI_SUMMARIZE: {
    limit: 5,
    windowMs: 60 * 1000,
  },
  /** AI 질문 생성 - 분당 5회 */
  AI_QUESTIONS: {
    limit: 5,
    windowMs: 60 * 1000,
  },
  /** OCR - 분당 10회 */
  OCR: {
    limit: 10,
    windowMs: 60 * 1000,
  },
} as const

/**
 * Rate limit 에러 응답 생성
 */
export function createRateLimitResponse(result: RateLimitResult) {
  const retryAfterSeconds = Math.ceil(result.resetIn / 1000)

  return {
    status: 429,
    headers: {
      'Retry-After': String(retryAfterSeconds),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(retryAfterSeconds),
    },
    body: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `요청이 너무 많습니다. ${retryAfterSeconds}초 후에 다시 시도해주세요.`,
      },
    },
  }
}
