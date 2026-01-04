import type { PlasmoCSConfig } from 'plasmo'
import type { ParsedApplication, ParseMessage } from '~lib/types'

export const config: PlasmoCSConfig = {
  matches: [
    'https://www.saramin.co.kr/zf_user/applyin-status*',
    'https://www.saramin.co.kr/zf_user/apply*',
    'https://www.saramin.co.kr/zf_user/members/apply*',
  ],
  run_at: 'document_idle',
}

/**
 * 사람인 지원현황 페이지 파서
 * - URL: https://www.saramin.co.kr/zf_user/applyin-status
 * - DOM에서 지원 내역을 파싱하여 Background로 전달
 */

/**
 * DOM이 안정화될 때까지 대기
 */
async function waitForDOM(): Promise<void> {
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
 * 지원 목록이 렌더링될 때까지 대기
 */
async function waitForApplicationList(): Promise<boolean> {
  return new Promise((resolve) => {
    let checkCount = 0
    const maxChecks = 20

    const checkInterval = setInterval(() => {
      checkCount++

      // 사람인 지원 목록 컨테이너 확인
      const container = document.querySelector('.apply_list') ||
                       document.querySelector('.list_apply') ||
                       document.querySelector('[class*="apply"]') ||
                       document.querySelector('table.list') ||
                       document.querySelector('.content_list')

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
    '접수': 'applied',
    '접수완료': 'applied',
    '서류접수': 'applied',
    '서류통과': 'document_passed',
    '서류 통과': 'document_passed',
    '서류합격': 'document_passed',
    '서류 합격': 'document_passed',
    '1차 합격': 'document_passed',
    '면접진행': 'interview',
    '면접 진행': 'interview',
    '면접예정': 'interview',
    '면접 예정': 'interview',
    '면접대기': 'interview',
    '최종합격': 'accepted',
    '최종 합격': 'accepted',
    '합격': 'accepted',
    '채용': 'accepted',
    '불합격': 'rejected',
    '탈락': 'rejected',
    '서류불합격': 'rejected',
    '서류 불합격': 'rejected',
    '미달': 'rejected',
    '마감': 'rejected',
  }

  const normalized = statusText.trim()
  return statusMap[normalized] || 'applied'
}

/**
 * 날짜 텍스트를 ISO 형식으로 변환
 */
function parseDate(dateText: string): string {
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
 * 사람인 지원현황 페이지에서 지원 내역 파싱
 */
function parseSaraminApplications(): ParsedApplication[] {
  const applications: ParsedApplication[] = []

  // 사람인은 테이블 또는 리스트 형태로 표시
  const selectors = [
    '.apply_list > li',
    '.list_apply > li',
    'table.list tbody tr',
    '.content_list > li',
    '[class*="apply"] li',
    '[class*="apply"] tr',
    '.wrap_apply_list li',
  ]

  let applicationItems: NodeListOf<Element> | null = null

  for (const selector of selectors) {
    const items = document.querySelectorAll(selector)
    if (items.length > 0) {
      applicationItems = items
      console.log(`[Saramin Parser] Found ${items.length} items with selector: ${selector}`)
      break
    }
  }

  if (!applicationItems || applicationItems.length === 0) {
    console.log('[Saramin Parser] No application items found')
    return applications
  }

  for (const item of applicationItems) {
    try {
      const application = parseApplicationItem(item)
      if (application) {
        applications.push(application)
      }
    } catch (error) {
      console.error('[Saramin Parser] Failed to parse item:', error)
    }
  }

  return applications
}

/**
 * 개별 지원 항목 파싱
 */
function parseApplicationItem(item: Element): ParsedApplication | null {
  // 회사명 추출
  const companyName = extractText(item, [
    '.company_name',
    '.corp_name',
    '.name_company',
    '[class*="company"]',
    '[class*="corp"]',
    'td:nth-child(1)',
    '.tit_company',
  ])

  // 포지션명 추출
  const position = extractText(item, [
    '.job_name',
    '.title',
    '.job_title',
    '[class*="position"]',
    '[class*="job"]',
    'td:nth-child(2)',
    '.tit_job',
  ])

  // 지원일 추출
  const appliedAtText = extractText(item, [
    '.apply_date',
    '.date',
    '[class*="date"]',
    'td:nth-child(3)',
    '.date_apply',
    'time',
  ])

  // 상태 추출
  const statusText = extractText(item, [
    '.apply_status',
    '.status',
    '.state',
    '[class*="status"]',
    '[class*="state"]',
    'td:last-child',
    '.txt_status',
  ])

  // URL 추출
  const sourceUrl = extractLink(item, [
    'a[href*="/zf_info/"]',
    'a[href*="/recruit/"]',
    'a[href*="rec_idx"]',
    'a.job_link',
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
    platform: 'saramin',
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
      platform: 'saramin',
      applications: error ? undefined : applications,
      error,
      timestamp: Date.now(),
    },
  }

  try {
    await chrome.runtime.sendMessage(message)
    console.log('[Saramin Parser] Result sent to background:', message.type)
  } catch (err) {
    console.error('[Saramin Parser] Failed to send result:', err)
  }
}

/**
 * 메인 파싱 로직
 */
async function main(): Promise<void> {
  console.log('[Saramin Parser] 사람인 지원현황 페이지 감지')

  showOverlay('지원 내역 수집 중...')

  try {
    await waitForDOM()

    const hasApplicationList = await waitForApplicationList()

    if (!hasApplicationList) {
      showOverlay('지원 내역이 없거나 페이지를 찾을 수 없습니다', 'error')
      hideOverlay()
      await sendParseResult([], '지원 목록을 찾을 수 없습니다')
      return
    }

    const applications = parseSaraminApplications()

    if (applications.length === 0) {
      showOverlay('지원 내역이 없습니다', 'success')
      hideOverlay()
      await sendParseResult([])
      return
    }

    showOverlay(`${applications.length}개의 지원 내역을 찾았습니다`, 'success')
    hideOverlay()

    await sendParseResult(applications)

    console.log('[Saramin Parser] Parsed applications:', applications)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    console.error('[Saramin Parser] Error:', error)

    showOverlay(`파싱 실패: ${errorMessage}`, 'error')
    hideOverlay()

    await sendParseResult([], errorMessage)
  }
}

// 페이지 로드 시 자동 실행
main()
