/**
 * DOM 관련 공통 유틸리티
 * 원티드, 사람인 파서에서 공통으로 사용
 */

/**
 * DOM이 안정화될 때까지 대기
 */
export async function waitForDOM(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      setTimeout(resolve, 1000)
      return
    }
    window.addEventListener('load', () => {
      setTimeout(resolve, 1000)
    })
  })
}

/**
 * 특정 셀렉터가 나타날 때까지 대기
 */
export async function waitForSelector(
  selectors: string[],
  options: { maxChecks?: number; interval?: number } = {}
): Promise<boolean> {
  const { maxChecks = 20, interval = 500 } = options

  return new Promise((resolve) => {
    let checkCount = 0

    const checkInterval = setInterval(() => {
      checkCount++

      const found = selectors.some(selector => document.querySelector(selector))

      if (found || checkCount >= maxChecks) {
        clearInterval(checkInterval)
        resolve(found)
      }
    }, interval)
  })
}

/**
 * 여러 셀렉터로 텍스트 추출
 */
export function extractText(parent: Element, selectors: string[]): string {
  for (const selector of selectors) {
    const element = parent.querySelector(selector)
    if (element?.textContent?.trim()) {
      return element.textContent.trim()
    }
  }
  return ''
}

/**
 * 여러 셀렉터로 링크 추출
 */
export function extractLink(parent: Element, selectors: string[]): string {
  for (const selector of selectors) {
    const element = parent.querySelector(selector) as HTMLAnchorElement
    if (element?.href) {
      return element.href
    }
  }
  return ''
}

/**
 * 날짜 텍스트를 ISO 형식(YYYY-MM-DD)으로 변환
 */
export function parseDate(dateText: string): string {
  const text = dateText.trim()

  // YYYY.MM.DD 또는 YYYY-MM-DD 형식 (공백 허용: "2026. 1. 3")
  const fullDateMatch = text.match(/(\d{4})[.\-/]\s*(\d{1,2})[.\-/]?\s*(\d{1,2})/)
  if (fullDateMatch) {
    const [, year, month, day] = fullDateMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // YY.MM.DD 형식 (2자리 연도)
  const shortYearMatch = text.match(/(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (shortYearMatch) {
    const [, year, month, day] = shortYearMatch
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // MM.DD 또는 M월 D일 형식
  const shortDateMatch = text.match(/(\d{1,2})[월.\-/]?\s*(\d{1,2})[일]?/)
  if (shortDateMatch) {
    const [, month, day] = shortDateMatch
    const year = new Date().getFullYear()
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // 파싱 실패 시 현재 날짜
  return new Date().toISOString().split('T')[0]
}
