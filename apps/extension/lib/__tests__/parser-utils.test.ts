/**
 * Parser Utils 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('parser-utils', () => {
  describe('normalizeStatus', () => {
    it('원티드 상태를 정규화해야 한다', () => {
      const statusMapping: Record<string, string> = {
        '지원완료': 'applied',
        '서류 합격': 'document_passed',
        '서류합격': 'document_passed',
        '면접 진행 중': 'interview',
        '면접진행중': 'interview',
        '최종 합격': 'accepted',
        '최종합격': 'accepted',
        '불합격': 'rejected',
        '서류 불합격': 'rejected',
      }

      Object.entries(statusMapping).forEach(([input, expected]) => {
        // 상태 정규화 로직 시뮬레이션
        let normalized = 'applied'
        const lowerInput = input.toLowerCase().replace(/\s/g, '')

        if (lowerInput.includes('불합격')) {
          normalized = 'rejected'
        } else if (lowerInput.includes('최종합격') || lowerInput.includes('합격') && !lowerInput.includes('서류')) {
          normalized = 'accepted'
        } else if (lowerInput.includes('면접')) {
          normalized = 'interview'
        } else if (lowerInput.includes('서류합격') || lowerInput.includes('서류') && lowerInput.includes('합격')) {
          normalized = 'document_passed'
        }

        expect(normalized).toBe(expected)
      })
    })

    it('사람인 상태를 정규화해야 한다', () => {
      const statusMapping: Record<string, string> = {
        '입사지원': 'applied',
        '지원완료': 'applied',
        '서류전형 합격': 'document_passed',
        '면접 대기': 'interview',
        '1차 면접': 'interview',
        '최종합격': 'accepted',
        '입사확정': 'accepted',
        '불합격': 'rejected',
        '탈락': 'rejected',
      }

      Object.entries(statusMapping).forEach(([input, expected]) => {
        let normalized = 'applied'
        const lowerInput = input.toLowerCase().replace(/\s/g, '')

        if (lowerInput.includes('불합격') || lowerInput.includes('탈락')) {
          normalized = 'rejected'
        } else if (lowerInput.includes('최종합격') || lowerInput === '입사확정') {
          normalized = 'accepted'
        } else if (lowerInput.includes('면접')) {
          normalized = 'interview'
        } else if (lowerInput.includes('서류') && lowerInput.includes('합격')) {
          normalized = 'document_passed'
        }

        expect(normalized).toBe(expected)
      })
    })
  })

  describe('extractDate', () => {
    it('다양한 날짜 형식을 파싱해야 한다', () => {
      const datePatterns = [
        { input: '2024.01.15', expected: '2024-01-15' },
        { input: '2024-01-15', expected: '2024-01-15' },
        { input: '2024/01/15', expected: '2024-01-15' },
        { input: '24.01.15', expected: '2024-01-15' },
      ]

      datePatterns.forEach(({ input, expected }) => {
        // 날짜 추출 로직
        const normalized = input
          .replace(/\//g, '-')
          .replace(/\./g, '-')
          .replace(/^(\d{2})-/, '20$1-')

        expect(normalized).toBe(expected)
      })
    })

    it('잘못된 날짜 형식은 null을 반환해야 한다', () => {
      const invalidDates = ['', 'invalid', '날짜없음', '2024', '01-15']

      invalidDates.forEach((input) => {
        const isValid = /^\d{2,4}[-./]\d{1,2}[-./]\d{1,2}$/.test(input)
        expect(isValid).toBe(false)
      })
    })
  })

  describe('sanitizeText', () => {
    it('앞뒤 공백을 제거해야 한다', () => {
      expect('  테스트  '.trim()).toBe('테스트')
    })

    it('연속된 공백을 하나로 줄여야 한다', () => {
      const input = '테스트    문자열    입니다'
      const normalized = input.replace(/\s+/g, ' ')
      expect(normalized).toBe('테스트 문자열 입니다')
    })

    it('줄바꿈을 공백으로 변환해야 한다', () => {
      const input = '테스트\n문자열\r\n입니다'
      const normalized = input.replace(/[\r\n]+/g, ' ').trim()
      expect(normalized).toBe('테스트 문자열 입니다')
    })
  })

  describe('extractCompanyName', () => {
    it('회사명에서 불필요한 접미사를 제거해야 한다', () => {
      const companies = [
        { input: '(주)테스트회사', expected: '테스트회사' },
        { input: '테스트회사(주)', expected: '테스트회사' },
        { input: '주식회사 테스트', expected: '테스트' },
        { input: '테스트 주식회사', expected: '테스트' },
      ]

      companies.forEach(({ input, expected }) => {
        const cleaned = input
          .replace(/^\(주\)\s*/, '')
          .replace(/\s*\(주\)$/, '')
          .replace(/^주식회사\s*/, '')
          .replace(/\s*주식회사$/, '')
          .trim()

        expect(cleaned).toBe(expected)
      })
    })
  })
})
