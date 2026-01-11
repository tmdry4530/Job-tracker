import type { PlasmoCSConfig } from 'plasmo'
import type { ParsedApplication } from '~lib/types'
import { showOverlay, hideOverlay } from '~lib/overlay'
import { waitForDOM, waitForSelector, extractText, extractLink, parseDate } from '~lib/dom-utils'
import { normalizeSaraminStatus } from '~lib/status-normalizer'
import { sendParseResult } from '~lib/parse-result'

export const config: PlasmoCSConfig = {
  matches: [
    'https://www.saramin.co.kr/zf_user/persons/apply-status-list*',
    'https://www.saramin.co.kr/zf_user/apply-management/*',
    'https://www.saramin.co.kr/zf_user/apply*',
    'https://www.saramin.co.kr/zf_user/members/apply*',
  ],
  run_at: 'document_idle',
}

/**
 * 사람인 지원현황 페이지 파서
 * - URL: https://www.saramin.co.kr/zf_user/apply-status
 * - DOM에서 지원 내역을 파싱하여 Background로 전달
 */

/** 지원 목록 컨테이너 셀렉터 */
const APPLICATION_LIST_SELECTORS = [
  '.apply_list',
  '.list_apply',
  '[class*="apply"]',
  'table.list',
  '.content_list',
]

/**
 * 사람인 지원현황 페이지에서 지원 내역 파싱
 */
function parseSaraminApplications(): ParsedApplication[] {
  const applications: ParsedApplication[] = []

  const selectors = [
    '.list_status .row._apply_list',
    '.list_status .row',
    '.wrap_list .row',
    '.apply_list > li',
    '.list_apply > li',
    'table.list tbody tr',
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
  const companyName = extractText(item, [
    '.corp a',
    '.corp',
    '.company_name',
    '[class*="company"]',
  ])

  const position = extractText(item, [
    '.recruit .division',
    '.recruit a',
    '.job_tit a',
    '.job_tit',
    '.title a',
  ])

  const appliedAtText = extractText(item, [
    '.col_date',
    '.col_apply_date',
    '.apply_date',
    '[class*="date"]',
  ])

  const statusText = extractText(item, [
    '.status .txt_status',
    '.txt_status',
    '.col_state .state',
    '.apply_status',
    '.status',
  ])

  const sourceUrl = extractLink(item, [
    '.recruit a',
    'a[href*="rec_idx"]',
    'a[href*="/zf_info/"]',
    '.corp a',
    'a',
  ])

  if (!companyName && !position) {
    return null
  }

  return {
    companyName: companyName || '알 수 없음',
    position: position || '알 수 없음',
    appliedAt: parseDate(appliedAtText),
    status: normalizeSaraminStatus(statusText),
    sourceUrl: sourceUrl || window.location.href,
    platform: 'saramin',
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

    const hasApplicationList = await waitForSelector(APPLICATION_LIST_SELECTORS)

    if (!hasApplicationList) {
      showOverlay('지원 내역이 없거나 페이지를 찾을 수 없습니다', 'error')
      hideOverlay()
      await sendParseResult('saramin', [], '지원 목록을 찾을 수 없습니다')
      return
    }

    const applications = parseSaraminApplications()

    if (applications.length === 0) {
      showOverlay('지원 내역이 없습니다', 'success')
      hideOverlay()
      await sendParseResult('saramin', [])
      return
    }

    showOverlay(`${applications.length}개의 지원 내역을 찾았습니다`, 'success')
    hideOverlay()

    await sendParseResult('saramin', applications)

    console.log('[Saramin Parser] Parsed applications:', applications)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    console.error('[Saramin Parser] Error:', error)

    showOverlay(`파싱 실패: ${errorMessage}`, 'error')
    hideOverlay()

    await sendParseResult('saramin', [], errorMessage)
  }
}

// 페이지 로드 시 자동 실행
main()
