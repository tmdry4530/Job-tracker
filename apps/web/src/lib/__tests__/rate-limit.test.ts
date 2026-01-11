/**
 * Rate Limit 유틸리티 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '../rate-limit'

describe('rate-limit', () => {
  beforeEach(() => {
    // 각 테스트 전에 타이머 초기화
    vi.useFakeTimers()
  })

  describe('checkRateLimit', () => {
    it('첫 번째 요청은 허용해야 한다', () => {
      const result = checkRateLimit('test-user-1', { limit: 5, windowMs: 60000 })

      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('제한 내 요청은 모두 허용해야 한다', () => {
      const config = { limit: 3, windowMs: 60000 }
      const userId = 'test-user-2'

      const result1 = checkRateLimit(userId, config)
      const result2 = checkRateLimit(userId, config)
      const result3 = checkRateLimit(userId, config)

      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(2)

      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(1)

      expect(result3.success).toBe(true)
      expect(result3.remaining).toBe(0)
    })

    it('제한 초과 시 요청을 거부해야 한다', () => {
      const config = { limit: 2, windowMs: 60000 }
      const userId = 'test-user-3'

      checkRateLimit(userId, config)
      checkRateLimit(userId, config)
      const result = checkRateLimit(userId, config)

      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('시간 윈도우 후에는 제한이 리셋되어야 한다', () => {
      const config = { limit: 1, windowMs: 1000 }
      const userId = 'test-user-4'

      const result1 = checkRateLimit(userId, config)
      expect(result1.success).toBe(true)

      const result2 = checkRateLimit(userId, config)
      expect(result2.success).toBe(false)

      // 시간 경과
      vi.advanceTimersByTime(1100)

      const result3 = checkRateLimit(userId, config)
      expect(result3.success).toBe(true)
    })

    it('다른 사용자는 별도로 제한되어야 한다', () => {
      const config = { limit: 1, windowMs: 60000 }

      const result1 = checkRateLimit('user-a', config)
      const result2 = checkRateLimit('user-b', config)

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })
  })

  describe('RATE_LIMITS', () => {
    it('AI_SUMMARIZE 설정이 올바르게 정의되어야 한다', () => {
      expect(RATE_LIMITS.AI_SUMMARIZE.limit).toBe(5)
      expect(RATE_LIMITS.AI_SUMMARIZE.windowMs).toBe(60000)
    })

    it('AI_QUESTIONS 설정이 올바르게 정의되어야 한다', () => {
      expect(RATE_LIMITS.AI_QUESTIONS.limit).toBe(5)
      expect(RATE_LIMITS.AI_QUESTIONS.windowMs).toBe(60000)
    })

    it('OCR 설정이 올바르게 정의되어야 한다', () => {
      expect(RATE_LIMITS.OCR.limit).toBe(10)
      expect(RATE_LIMITS.OCR.windowMs).toBe(60000)
    })
  })

  describe('createRateLimitResponse', () => {
    it('429 상태 코드와 올바른 헤더를 반환해야 한다', () => {
      const result = {
        success: false,
        remaining: 0,
        resetIn: 30000,
      }

      const response = createRateLimitResponse(result)

      expect(response.status).toBe(429)
      expect(response.headers['Retry-After']).toBe('30')
      expect(response.headers['X-RateLimit-Remaining']).toBe('0')
    })

    it('에러 메시지에 대기 시간이 포함되어야 한다', () => {
      const result = {
        success: false,
        remaining: 0,
        resetIn: 45000,
      }

      const response = createRateLimitResponse(result)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(response.body.error.message).toContain('45')
    })
  })
})
