import type { PlasmoCSConfig } from 'plasmo'
import type { ParsedApplication, ParseMessage } from '~lib/types'

export const config: PlasmoCSConfig = {
  matches: [
    'https://www.wanted.co.kr/status/applications*',
    'https://www.wanted.co.kr/status/applications/*',
  ],
  run_at: 'document_idle',
}

/**
 * 원티드 지원현황 페이지 파서
 * - URL: https://www.wanted.co.kr/status/applications
 * - API 인터셉터에서 받은 데이터 또는 DOM에서 지원 내역을 파싱
 * - job_id를 활용하여 상세 공고 URL 생성
 */

// API 인터셉터에서 전달받은 데이터 저장
interface InterceptedApplication {
  job_id: number
  company_name: string
  company_id: number
  status: string
  create_time: string
  position?: string
}

let interceptedApiData: InterceptedApplication[] = []

// 인터셉터(MAIN world)에서 postMessage로 보내는 데이터 수신
window.addEventListener('message', (event: MessageEvent) => {
  // 같은 window에서 온 메시지만 처리
  if (event.source !== window) return

  if (event.data?.type === 'WANTED_APPLICATIONS_INTERCEPTED' && event.data?.applications) {
    interceptedApiData = event.data.applications
    console.log('[Wanted Parser] Received intercepted API data via postMessage:', interceptedApiData.length)
  }
})

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

      // 지원 목록 컨테이너 확인 (원티드 실제 클래스: List_List_table__*)
      const container = document.querySelector('[class*="List_List_table"]') ||
                       document.querySelector('[class*="List_table"]') ||
                       document.querySelector('[class*="ApplicationList"]')

      console.log(`[Wanted Parser] Checking for container (${checkCount}/${maxChecks}):`, !!container)

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
    '접수': 'applied',
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
  // 다양한 형식 처리: "2024.01.15", "2024-01-15", "2026. 1. 3", "1월 15일"
  const text = dateText.trim()

  // YYYY.MM.DD 또는 YYYY-MM-DD 형식 (공백 허용: "2026. 1. 3")
  const fullDateMatch = text.match(/(\d{4})[.\-/]\s*(\d{1,2})[.\-/]?\s*(\d{1,2})/)
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
  console.log('[Wanted Parser] Date parsing failed for:', text)
  return new Date().toISOString().split('T')[0]
}

/**
 * API 상태값을 표준 상태로 변환
 */
function normalizeApiStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'complete': 'applied',
    'applied': 'applied',
    'hiring_complete': 'accepted',
    'accepted': 'accepted',
    'rejected': 'rejected',
    'interview': 'interview',
    'document_passed': 'document_passed',
  }
  return statusMap[status?.toLowerCase()] || 'applied'
}

/**
 * DOM에서 포지션 목록 추출
 */
function extractPositionsFromDom(): string[] {
  const positions: string[] = []

  // 포지션 셀 선택 (헤더 제외)
  const positionCells = document.querySelectorAll('[class*="table_td_position"]')

  positionCells.forEach(cell => {
    const text = cell.textContent?.trim() || ''
    if (text && text !== '포지션') { // 헤더 제외
      positions.push(text)
    }
  })

  console.log('[Wanted Parser] Extracted positions from DOM:', positions.length)
  return positions
}

/**
 * 인터셉트된 API 데이터 + DOM 포지션을 ParsedApplication으로 변환
 */
function convertInterceptedData(data: InterceptedApplication[]): ParsedApplication[] {
  // DOM에서 포지션 추출
  const positions = extractPositionsFromDom()

  return data.map((app, index) => ({
    companyName: app.company_name || '알 수 없음',
    position: positions[index] || app.position || '포지션 정보 없음',
    appliedAt: app.create_time ? app.create_time.split('T')[0] : new Date().toISOString().split('T')[0],
    status: normalizeApiStatus(app.status),
    sourceUrl: app.job_id ? `https://www.wanted.co.kr/wd/${app.job_id}` : '',
    platform: 'wanted' as const,
  }))
}

/**
 * API 데이터 대기 (인터셉터에서 데이터를 받을 때까지)
 */
async function waitForInterceptedData(timeoutMs: number = 5000): Promise<InterceptedApplication[]> {
  if (interceptedApiData.length > 0) {
    return interceptedApiData
  }

  return new Promise((resolve) => {
    const startTime = Date.now()

    const checkInterval = setInterval(() => {
      if (interceptedApiData.length > 0) {
        clearInterval(checkInterval)
        resolve(interceptedApiData)
      } else if (Date.now() - startTime >= timeoutMs) {
        clearInterval(checkInterval)
        resolve([])
      }
    }, 200)
  })
}

/**
 * 원티드 지원현황 페이지에서 지원 내역 파싱 (DOM 폴백)
 */
function parseWantedApplicationsFromDom(): ParsedApplication[] {
  const applications: ParsedApplication[] = []

  const selectors = [
    '[class*="List_List_table_tr"]',
    '[class*="List_table_tr"]',
    '[class*="ApplicationCard"]',
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
    return applications
  }

  const dataRows = Array.from(applicationItems).slice(1)

  for (const item of dataRows) {
    try {
      const application = parseApplicationItem(item)
      if (application) {
        applications.push(application)
      }
    } catch (error) {
      console.error('[Wanted Parser] Failed to parse item:', error)
    }
  }

  return applications
}

/**
 * 개별 지원 항목 파싱
 */
function parseApplicationItem(item: Element): ParsedApplication | null {
  // 회사명 추출 (원티드 실제 클래스: List_List_table_td_company_name__*)
  const companyName = extractText(item, [
    '[class*="table_td_company_name"]',
    '[class*="company_name"]',
    '[class*="company"]',
  ])

  // 포지션명 추출 (원티드 실제 클래스: List_List_table_td_position__*)
  const position = extractText(item, [
    '[class*="table_td_position"]',
    '[class*="position"]',
    '[class*="title"]',
  ])

  // 지원일 추출 (원티드 실제 클래스: List_List_table_td_create_time__*)
  const appliedAtText = extractText(item, [
    '[class*="table_td_create_time"]',
    '[class*="create_time"]',
    '[class*="date"]',
    'time',
  ])

  // 상태 추출 (원티드 실제 클래스: List_List_table_td_status__*)
  const statusText = extractText(item, [
    '[class*="table_td_status"]',
    '[class*="status"]',
    '[class*="process"]',
    '[class*="state"]',
  ])

  // URL 추출 (원티드는 a 태그 없음)
  let sourceUrl = extractLink(item, [
    'a[href*="/wd/"]',
    'a[href*="/position/"]',
    'a',
  ])

  // 필수 필드 검증
  if (!companyName && !position) {
    return null
  }

  // 고유 URL 생성: 개별 링크가 없으면 원티드 검색 URL로 생성
  if (!sourceUrl) {
    const searchQuery = encodeURIComponent(`${companyName} ${position}`)
    sourceUrl = `https://www.wanted.co.kr/search?query=${searchQuery}`
  }

  return {
    companyName: companyName || '알 수 없음',
    position: position || '알 수 없음',
    appliedAt: parseDate(appliedAtText),
    status: normalizeStatus(statusText),
    sourceUrl,
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
      showOverlay('지원 내역이 없거나 페이지를 찾을 수 없습니다', 'error')
      hideOverlay()
      await sendParseResult([], '지원 목록을 찾을 수 없습니다')
      return
    }

    let applications: ParsedApplication[] = []

    // 1. 먼저 인터셉터에서 API 데이터를 받았는지 확인
    console.log('[Wanted Parser] Waiting for intercepted API data...')
    const apiData = await waitForInterceptedData(3000)

    if (apiData.length > 0) {
      console.log(`[Wanted Parser] Using intercepted API data: ${apiData.length} items`)
      applications = convertInterceptedData(apiData)
    } else {
      // 2. API 데이터 없으면 DOM 파싱으로 폴백
      console.log('[Wanted Parser] No API data, falling back to DOM parsing')
      applications = parseWantedApplicationsFromDom()
    }

    if (applications.length === 0) {
      showOverlay('지원 내역이 없습니다', 'success')
      hideOverlay()
      await sendParseResult([])
      return
    }

    // 성공 표시
    const sourceType = apiData.length > 0 ? 'API' : 'DOM'
    showOverlay(`${applications.length}개의 지원 내역을 찾았습니다 (${sourceType})`, 'success')
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
