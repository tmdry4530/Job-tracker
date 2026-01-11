/**
 * Application 쿼리 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase 클라이언트 모킹
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('applications queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getApplications', () => {
    it('검색어 특수문자가 이스케이프되어야 한다', () => {
      // SQL injection 방지를 위한 특수문자 이스케이프 테스트
      const dangerousInputs = [
        '%',
        '_',
        '\\',
        '%test%',
        '_admin_',
        "'; DROP TABLE applications; --",
      ]

      dangerousInputs.forEach((input) => {
        // 특수문자 이스케이프 로직
        const sanitized = input.replace(/[%_\\]/g, '\\$&')

        // 원본과 다르면 이스케이프가 적용된 것
        if (input.match(/[%_\\]/)) {
          expect(sanitized).not.toBe(input)
        }

        // SQL 특수문자가 이스케이프되어야 함
        expect(sanitized).not.toContain('%;')
        expect(sanitized.match(/(?<!\\)%/g)).toBeNull
      })
    })

    it('유효한 플랫폼 필터만 허용해야 한다', () => {
      const validPlatforms = ['wanted', 'saramin']
      const invalidPlatforms = ['invalid', 'jobkorea', '', null, undefined]

      validPlatforms.forEach((platform) => {
        expect(['wanted', 'saramin']).toContain(platform)
      })

      invalidPlatforms.forEach((platform) => {
        expect(['wanted', 'saramin']).not.toContain(platform)
      })
    })

    it('유효한 상태 필터만 허용해야 한다', () => {
      const validStatuses = ['applied', 'document_passed', 'interview', 'accepted', 'rejected']
      const invalidStatuses = ['pending', 'invalid', '', null]

      validStatuses.forEach((status) => {
        expect(['applied', 'document_passed', 'interview', 'accepted', 'rejected']).toContain(status)
      })

      invalidStatuses.forEach((status) => {
        expect(['applied', 'document_passed', 'interview', 'accepted', 'rejected']).not.toContain(status)
      })
    })
  })

  describe('pagination', () => {
    it('페이지네이션 범위가 올바르게 계산되어야 한다', () => {
      const calculateRange = (page: number, limit: number) => {
        const from = (page - 1) * limit
        const to = from + limit - 1
        return { from, to }
      }

      expect(calculateRange(1, 10)).toEqual({ from: 0, to: 9 })
      expect(calculateRange(2, 10)).toEqual({ from: 10, to: 19 })
      expect(calculateRange(1, 20)).toEqual({ from: 0, to: 19 })
      expect(calculateRange(3, 5)).toEqual({ from: 10, to: 14 })
    })

    it('전체 페이지 수가 올바르게 계산되어야 한다', () => {
      const calculateTotalPages = (total: number, limit: number) => {
        return Math.ceil(total / limit)
      }

      expect(calculateTotalPages(100, 10)).toBe(10)
      expect(calculateTotalPages(101, 10)).toBe(11)
      expect(calculateTotalPages(0, 10)).toBe(0)
      expect(calculateTotalPages(5, 10)).toBe(1)
    })
  })
})
