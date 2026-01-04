import type { PlasmoCSConfig } from 'plasmo'
import type { ParsedApplication, ParseMessage } from '~lib/types'

export const config: PlasmoCSConfig = {
  matches: ['https://www.wanted.co.kr/cv/applications*'],
  run_at: 'document_idle',
}

/**
 * 원티드 지원현황 페이지 파서
 * - URL: https://www.wanted.co.kr/cv/applications
 * - DOM에서 지원 내역을 파싱하여 Background로 전달
 */

const PARSE_TIMEOUT_MS = 10000 // 10초 타임아웃
const STABILITY_CHECK_COUNT = 3 // DOM 안정화 확인 횟수
const STABILITY_CHECK_INTERVAL_MS = 500 // DOM 안정화 확인 간격

/**
 * DOM이 안정화될 때까지 대기
 */
async function waitForDOM(): Promise<void> {
  return new Promise((resolve) => {
    // 이미 로드된 경우
    if (document.readyState === 'complete') {
      // 추가 대기 (React 렌더링 완료)
      setTimeout(resolve, 1000)
      return
    }

    // 로드 완료 대기
    window.addEventListener('load', () => {
      setTimeout(resolve, 1000)
    })
  })
}

/**
 * 지원 목록이 렌더링될 때까지 대기
 */
async function waitForApplicationList(): Promise<boolean> {
  return new Promise((resolve) => {
    let checkCount = 0
    const maxChecks = 20 // 최대 10초 대기

    const checkInterval = setInterval(() => {
      checkCount++

      // 지원 목록 컨테이너 확인 (여러 셀렉터 시도)
      const container = document.querySelector('[class*="ApplicationList"]') ||
                       document.querySelector('[class*="application"]') ||
                       document.querySelector('main [class*="list"]')

      if (container || checkCount >= maxChecks) {
        clearInterval(checkInterval)
        resolve(!!container)
      }
    }, 500)
  })
}

/**
 * 지원 상태 텍스트를 표준 상태로 변환
 */
function normalizeStatus(statusText: string): string {
  const statusMap: Record<string, string> = {
    '지원완료': 'applied',
    '지원 완료': 'applied',
    '서류통과': 'document_passed',
    '서류 통과': 'document_passed',
    '서류 합격': 'document_passed',
    '면접진행': 'interview',
    '면접 진행': 'interview',
    '면접': 'interview',
    '최종합격': 'accepted',
    '최종 합격': 'accepted',
    '합격': 'accepted',
    '불합격': 'rejected',
    '탈락': 'rejected',
    '서류 불합격': 'rejected',
  }

  const normalized = statusText.trim()
  return statusMap[normalized] || 'applied'
}

/**
 * 날짜 텍스트를 ISO 형식으로 변환
 */
function parseDate(dateText: string): string {
  // 다양한 형식 처리: "2024.01.15", "2024-01-15", "1월 15일"
  const text = dateText.trim()

  // YYYY.MM.DD 또는 YYYY-MM-DD 형식
  const fullDateMatch = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (fullDateMatch) {
    const [, year, month, day] = fullDateMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // MM.DD 또는 M월 D일 형식 (현재 연도 가정)
  const shortDateMatch = text.match(/(\d{1,2})[월.\-/]?\s*(\d{1,2})[일]?/)
  if (shortDateMatch) {
    const [, month, day] = shortDateMatch
    const year = new Date().getFullYear()
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // 파싱 실패 시 현재 날짜
  return new Date().toISOString().split('T')[0]
}

/**
 * 원티드 지원현황 페이지에서 지원 내역 파싱
 */
function parseWantedApplications(): ParsedApplication[] {
  const applications: ParsedApplication[] = []

  // 원티드는 지원 목록을 카드/리스트 형태로 표시
  // 여러 셀렉터 시도 (DOM 구조 변경 대응)
  const selectors = [
    '[class*="ApplicationCard"]',
    '[class*="application-card"]',
    '[class*="ApplicationItem"]',
    '[class*="application-item"]',
    'main ul > li',
    '[class*="JobCard"]',
  ]

  let applicationItems: NodeListOf<Element> | null = null

  for (const selector of selectors) {
    const items = document.querySelectorAll(selector)
    if (items.length > 0) {
      applicationItems = items
      console.log(`[Wanted Parser] Found ${items.length} items with selector: ${selector}`)
      break
    }
  }

  if (!applicationItems || applicationItems.length === 0) {
    console.log('[Wanted Parser] No application items found')
    return applications
  }

  for (const item of applicationItems) {
    try {
      const application = parseApplicationItem(item)
      if (application) {
        applications.push(application)
      }
    } catch (error) {
      console.error('[Wanted Parser] Failed to parse item:', error)
      // 개별 항목 실패는 전체 파싱을 중단하지 않음
    }
  }

  return applications
}

/**
 * 개별 지원 항목 파싱
 */
function parseApplicationItem(item: Element): ParsedApplication | null {
  // 텍스트 컨텐츠에서 정보 추출
  const textContent = item.textContent || ''

  // 회사명 추출 (여러 셀렉터 시도)
  const companyName = extractText(item, [
    '[class*="company"]',
    '[class*="Company"]',
    'h3',
    'h4',
    '[class*="name"]',
  ])

  // 포지션명 추출
  const position = extractText(item, [
    '[class*="position"]',
    '[class*="Position"]',
    '[class*="title"]',
    '[class*="Title"]',
    'h4',
    'p',
  ])

  // 지원일 추출
  const appliedAtText = extractText(item, [
    '[class*="date"]',
    '[class*="Date"]',
    '[class*="time"]',
    'time',
    'span[class*="apply"]',
  ])

  // 상태 추출
  const statusText = extractText(item, [
    '[class*="status"]',
    '[class*="Status"]',
    '[class*="badge"]',
    '[class*="Badge"]',
    '[class*="state"]',
  ])

  // URL 추출
  const sourceUrl = extractLink(item, [
    'a[href*="/wd/"]',
    'a[href*="/position/"]',
    'a[href*="/job/"]',
    'a',
  ])

  // 필수 필드 검증
  if (!companyName && !position) {
    return null
  }

  return {
    companyName: companyName || '알 수 없음',
    position: position || '알 수 없음',
    appliedAt: parseDate(appliedAtText),
    status: normalizeStatus(statusText),
    sourceUrl: sourceUrl || window.location.href,
    platform: 'wanted',
  }
}

/**
 * 여러 셀렉터로 텍스트 추출
 */
function extractText(parent: Element, selectors: string[]): string {
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
function extractLink(parent: Element, selectors: string[]): string {
  for (const selector of selectors) {
    const element = parent.querySelector(selector) as HTMLAnchorElement
    if (element?.href) {
      return element.href
    }
  }
  return ''
}

/**
 * 파싱 상태 오버레이 표시
 */
function showOverlay(message: string, type: 'loading' | 'success' | 'error' = 'loading'): HTMLElement {
  // 기존 오버레이 제거
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
function hideOverlay(delay: number = 3000): void {
  setTimeout(() => {
    const overlay = document.getElementById('job-tracker-overlay')
    if (overlay) {
      overlay.style.transition = 'opacity 0.3s'
      overlay.style.opacity = '0'
      setTimeout(() => overlay.remove(), 300)
    }
  }, delay)
}

/**
 * Background로 파싱 결과 전송
 */
async function sendParseResult(applications: ParsedApplication[], error?: string): Promise<void> {
  const message: ParseMessage = {
    type: error ? 'PARSE_FAILED' : 'PARSE_COMPLETED',
    payload: {
      platform: 'wanted',
      applications: error ? undefined : applications,
      error,
      timestamp: Date.now(),
    },
  }

  try {
    await chrome.runtime.sendMessage(message)
    console.log('[Wanted Parser] Result sent to background:', message.type)
  } catch (err) {
    console.error('[Wanted Parser] Failed to send result:', err)
  }
}

/**
 * 메인 파싱 로직
 */
async function main(): Promise<void> {
  console.log('[Wanted Parser] 원티드 지원현황 페이지 감지')

  // 로딩 오버레이 표시
  showOverlay('지원 내역 수집 중...')

  try {
    // DOM 로드 대기
    await waitForDOM()

    // 지원 목록 렌더링 대기
    const hasApplicationList = await waitForApplicationList()

    if (!hasApplicationList) {
      // 지원 내역이 없거나 페이지 구조 변경
      showOverlay('지원 내역이 없거나 페이지를 찾을 수 없습니다', 'error')
      hideOverlay()
      await sendParseResult([], '지원 목록을 찾을 수 없습니다')
      return
    }

    // 파싱 실행
    const applications = parseWantedApplications()

    if (applications.length === 0) {
      showOverlay('지원 내역이 없습니다', 'success')
      hideOverlay()
      await sendParseResult([])
      return
    }

    // 성공 표시
    showOverlay(`${applications.length}개의 지원 내역을 찾았습니다`, 'success')
    hideOverlay()

    // Background로 전송
    await sendParseResult(applications)

    console.log('[Wanted Parser] Parsed applications:', applications)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    console.error('[Wanted Parser] Error:', error)

    showOverlay(`파싱 실패: ${errorMessage}`, 'error')
    hideOverlay()

    await sendParseResult([], errorMessage)
  }
}

// 페이지 로드 시 자동 실행
main()
