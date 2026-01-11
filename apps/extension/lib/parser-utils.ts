/**
 * 파서 공통 유틸리티
 * - wanted.ts와 saramin.ts에서 공유하는 함수들
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
  maxWaitMs: number = 10000
): Promise<Element | null> {
  return new Promise((resolve) => {
    let elapsed = 0
    const checkInterval = 500

    const interval = setInterval(() => {
      elapsed += checkInterval

      for (const selector of selectors) {
        const element = document.querySelector(selector)
        if (element) {
          clearInterval(interval)
          resolve(element)
          return
        }
      }

      if (elapsed >= maxWaitMs) {
        clearInterval(interval)
        resolve(null)
      }
    }, checkInterval)
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
 * 날짜 텍스트를 ISO 형식으로 변환
 */
export function parseDate(dateText: string): string {
  const text = dateText.trim()

  // YYYY.MM.DD 또는 YYYY-MM-DD 형식
  const fullDateMatch = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
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

  return new Date().toISOString().split('T')[0]
}

/**
 * 파싱 상태 오버레이 표시
 */
export function showOverlay(
  message: string,
  type: 'loading' | 'success' | 'error' = 'loading'
): HTMLElement {
  const existing = document.getElementById('job-tracker-overlay')
  if (existing) {
    existing.remove()
  }

  const colors = {
    loading: '#3B82F6',
    success: '#10B981',
    error: '#EF4444',
  }

  const icons = {
    loading: '📋',
    success: '✓',
    error: '✗',
  }

  const overlay = document.createElement('div')
  overlay.id = 'job-tracker-overlay'
  overlay.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 8px;
    ">
      <span>${icons[type]}</span>
      <span>${message}</span>
    </div>
  `
  document.body.appendChild(overlay)

  return overlay
}

/**
 * 오버레이 자동 제거
 */
export function hideOverlay(delay: number = 3000): void {
  setTimeout(() => {
    const overlay = document.getElementById('job-tracker-overlay')
    if (overlay) {
      overlay.style.transition = 'opacity 0.3s'
      overlay.style.opacity = '0'
      setTimeout(() => overlay.remove(), 300)
    }
  }, delay)
}
