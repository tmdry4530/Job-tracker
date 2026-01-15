import type { PlasmoCSConfig } from 'plasmo'
import type { ParsedApplication } from '~lib/types'
import { showOverlay, hideOverlay } from '~lib/overlay'
import { waitForDOM, waitForSelector, extractText, extractLink, parseDate } from '~lib/dom-utils'
import { sendParseResult } from '~lib/parse-result'

export const config: PlasmoCSConfig = {
  matches: [
    'https://www.wanted.co.kr/profile/bookmarks*',
    'https://www.wanted.co.kr/profile/bookmarks/*',
  ],
  run_at: 'document_idle',
}

/**
 * 원티드 북마크 페이지 파서
 * - URL: https://www.wanted.co.kr/profile/bookmarks
 * - DOM에서 북마크한 공고 목록을 파싱
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

interface InterceptedData {
  applications: InterceptedApplication[]
  total: number
  status?: string  // 현재 API의 status 파라미터
}

let interceptedApiData: InterceptedData = { applications: [], total: 0 }

// 인터셉터(MAIN world)에서 postMessage로 보내는 데이터 수신
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return

  if (event.data?.type === 'WANTED_APPLICATIONS_INTERCEPTED' && event.data?.applications) {
    interceptedApiData = {
      applications: event.data.applications,
      total: event.data.total || event.data.applications.length,
    }
    console.log('[Wanted Parser] Received intercepted API data:', interceptedApiData.applications.length, 'total:', interceptedApiData.total)
  }
})

/** 지원 목록 컨테이너 셀렉터 */
const APPLICATION_LIST_SELECTORS = [
  '[class*="List_List_table"]',
  '[class*="List_table"]',
  '[class*="ApplicationList"]',
]

/**
 * DOM에서 회사명-포지션 매핑 추출
 */
function extractCompanyPositionMapFromDom(): Map<string, string> {
  const companyPositionMap = new Map<string, string>()
  const rows = document.querySelectorAll('[class*="List_List_table_tr"]')

  rows.forEach((row, index) => {
    if (index === 0) {
      const headerCheck = row.querySelector('[class*="table_td_company_name"]')
      if (headerCheck?.textContent?.trim() === '지원 회사') return
    }

    const companyCell = row.querySelector('[class*="table_td_company_name"]')
    const positionCell = row.querySelector('[class*="table_td_position"]')

    const companyName = companyCell?.textContent?.trim() || ''
    const position = positionCell?.textContent?.trim() || ''

    if (companyName && position && companyName !== '지원 회사') {
      companyPositionMap.set(companyName, position)
    }
  })

  return companyPositionMap
}

/**
 * 인터셉트된 API 데이터 + DOM 포지션을 ParsedApplication으로 변환
 */
function convertInterceptedData(data: InterceptedApplication[]): ParsedApplication[] {
  const companyPositionMap = extractCompanyPositionMapFromDom()

  return data.map((app) => {
    const companyName = app.company_name || '알 수 없음'
    const position = companyPositionMap.get(companyName) || app.position || '포지션 정보 없음'

    return {
      companyName,
      position,
      savedAt: app.create_time ? app.create_time.split('T')[0] : new Date().toISOString().split('T')[0],
      sourceUrl: app.job_id ? `https://www.wanted.co.kr/wd/${app.job_id}` : '',
      platform: 'wanted' as const,
    }
  })
}

/**
 * API 데이터 대기 (인터셉터에서 데이터를 받을 때까지)
 */
async function waitForInterceptedData(timeoutMs: number = 5000): Promise<InterceptedData> {
  if (interceptedApiData.applications.length > 0) {
    return interceptedApiData
  }

  return new Promise((resolve) => {
    const startTime = Date.now()

    const checkInterval = setInterval(() => {
      if (interceptedApiData.applications.length > 0) {
        clearInterval(checkInterval)
        resolve(interceptedApiData)
      } else if (Date.now() - startTime >= timeoutMs) {
        clearInterval(checkInterval)
        resolve({ applications: [], total: 0 })
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
 * 개별 북마크 항목 파싱
 */
function parseApplicationItem(item: Element): ParsedApplication | null {
  const companyName = extractText(item, [
    '[class*="table_td_company_name"]',
    '[class*="company_name"]',
    '[class*="company"]',
  ])

  const position = extractText(item, [
    '[class*="table_td_position"]',
    '[class*="position"]',
    '[class*="title"]',
  ])

  const savedAtText = extractText(item, [
    '[class*="table_td_create_time"]',
    '[class*="create_time"]',
    '[class*="date"]',
    'time',
  ])

  let sourceUrl = extractLink(item, [
    'a[href*="/wd/"]',
    'a[href*="/position/"]',
    'a',
  ])

  if (!companyName && !position) {
    return null
  }

  if (!sourceUrl) {
    const searchQuery = encodeURIComponent(`${companyName} ${position}`)
    sourceUrl = `https://www.wanted.co.kr/search?query=${searchQuery}`
  }

  return {
    companyName: companyName || '알 수 없음',
    position: position || '알 수 없음',
    savedAt: parseDate(savedAtText),
    sourceUrl,
    platform: 'wanted',
  }
}

/**
 * 메인 파싱 로직
 */
async function main(): Promise<void> {
  console.log('[Wanted Parser] 원티드 북마크 페이지 감지')

  showOverlay('북마크 공고 수집 중...')

  try {
    await waitForDOM()

    const hasApplicationList = await waitForSelector(APPLICATION_LIST_SELECTORS)

    if (!hasApplicationList) {
      showOverlay('북마크 공고가 없거나 페이지를 찾을 수 없습니다', 'error')
      hideOverlay()
      await sendParseResult('wanted', [], '북마크 목록을 찾을 수 없습니다')
      return
    }

    let applications: ParsedApplication[] = []

    // 인터셉터에서 API 데이터를 받을 때까지 대기 (인터셉터가 페이지네이션 처리)
    console.log('[Wanted Parser] Waiting for intercepted API data...')
    const intercepted = await waitForInterceptedData(8000)  // 페이지네이션 처리 시간 고려

    if (intercepted.applications.length > 0) {
      console.log(`[Wanted Parser] Using intercepted API data: ${intercepted.applications.length} items, total: ${intercepted.total}`)
      applications = convertInterceptedData(intercepted.applications)
    } else {
      // API 데이터 없으면 DOM 파싱으로 폴백
      console.log('[Wanted Parser] No API data, falling back to DOM parsing')
      applications = parseWantedApplicationsFromDom()
    }

    if (applications.length === 0) {
      showOverlay('북마크 공고가 없습니다', 'success')
      hideOverlay()
      await sendParseResult('wanted', [])
      return
    }

    const sourceType = intercepted.applications.length > 0 ? 'API' : 'DOM'
    showOverlay(`${applications.length}개의 북마크 공고를 찾았습니다 (${sourceType})`, 'success')
    hideOverlay()

    await sendParseResult('wanted', applications)

    console.log('[Wanted Parser] Parsed applications:', applications)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    console.error('[Wanted Parser] Error:', error)

    showOverlay(`파싱 실패: ${errorMessage}`, 'error')
    hideOverlay()

    await sendParseResult('wanted', [], errorMessage)
  }
}

// 페이지 로드 시 자동 실행
main()
