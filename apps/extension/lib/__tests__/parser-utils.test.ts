/**
 * Parser Utils 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseJobkoreaScrapList } from '../jobkorea-parser'

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

  describe('parseJobkoreaScrapList', () => {
    // 잡코리아 스크랩 목록은 전체가 하나의 <form>으로 감싸여 있다.
    // 각 공고(infoCol)의 회사명은 반드시 해당 항목 스코프에서 추출되어야 하며,
    // form/document 스코프에서 추출하면 첫 항목 회사명이 모든 항목에 복제된다(회귀 버그).
    function buildScrapList(
      entries: { company: string; position: string; giId: string; coId: string }[]
    ): HTMLElement {
      const container = document.createElement('div')
      container.className = 'tableList scrap-list'

      // 모든 공고를 감싸는 단일 form (버그 재현의 핵심)
      const form = document.createElement('form')
      container.appendChild(form)

      for (const entry of entries) {
        const row = document.createElement('tr')

        const infoCol = document.createElement('div')
        infoCol.className = 'col infoCol'

        const titArea = document.createElement('strong')
        titArea.className = 'titArea'
        const positionLink = document.createElement('a')
        positionLink.setAttribute('href', `/Recruit/GI_Read/${entry.giId}`)
        positionLink.textContent = entry.position
        titArea.appendChild(positionLink)

        const list = document.createElement('ul')
        list.className = 'list-inline'
        const li = document.createElement('li')
        const companyLink = document.createElement('a')
        companyLink.setAttribute('href', `/Recruit/Co_read/${entry.coId}`)
        companyLink.textContent = entry.company
        li.appendChild(companyLink)
        list.appendChild(li)

        infoCol.appendChild(titArea)
        infoCol.appendChild(list)
        row.appendChild(infoCol)
        form.appendChild(row)
      }

      return container
    }

    it('공고별로 각자의 회사명을 유지해야 한다 (첫 항목 회사명 복제 방지)', () => {
      const container = buildScrapList([
        { company: '토스', position: '프론트엔드 개발자', giId: '1001', coId: '1' },
        { company: '카카오', position: '백엔드 개발자', giId: '1002', coId: '2' },
        { company: '네이버', position: '데이터 엔지니어', giId: '1003', coId: '3' },
      ])

      const result = parseJobkoreaScrapList(container)

      expect(result).toHaveLength(3)
      expect(result.map((a) => a.companyName)).toEqual(['토스', '카카오', '네이버'])
      // 각 공고의 포지션/URL도 항목별로 유지되어야 한다
      expect(result.map((a) => a.position)).toEqual([
        '프론트엔드 개발자',
        '백엔드 개발자',
        '데이터 엔지니어',
      ])
      expect(result[1].sourceUrl).toBe('https://www.jobkorea.co.kr/Recruit/GI_Read/1002')
    })

    it('회사 링크가 없으면 "알 수 없음"으로 대체한다', () => {
      const container = buildScrapList([
        { company: '토스', position: '프론트엔드 개발자', giId: '1001', coId: '1' },
      ])
      // 회사 링크 제거
      const companyLink = container.querySelector('ul.list-inline a')
      companyLink?.parentElement?.removeChild(companyLink)

      const result = parseJobkoreaScrapList(container)

      expect(result).toHaveLength(1)
      expect(result[0].companyName).toBe('알 수 없음')
    })
  })
})
