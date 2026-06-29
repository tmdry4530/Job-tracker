import type { PlasmoCSConfig } from 'plasmo'
import type { ParsedApplication } from '~lib/types'
import { showOverlay, hideOverlay } from '~lib/overlay'
import { waitForDOM, waitForSelector } from '~lib/dom-utils'
import { sendParseResult } from '~lib/parse-result'

export const config: PlasmoCSConfig = {
  matches: [
    'https://www.jobkorea.co.kr/User/Scrap*',
    'https://www.jobkorea.co.kr/User/scrap*',
  ],
  run_at: 'document_idle',
}

/**
 * 잡코리아 스크랩 페이지 파서
 * - URL: https://www.jobkorea.co.kr/User/Scrap
 * - DOM 구조:
 *   div.tableList.scrap-list
 *     └── form
 *          └── div.col.infoCol (공고 정보 영역)
 *               ├── strong.titArea
 *               │   └── a[href="/Recruit/GI_Read/..."] (공고 제목)
 *               └── ul.list-inline
 *                    └── li > a[href*="/Co_read"] (회사명)
 */

/** 스크랩 목록 컨테이너 셀렉터 */
const SCRAP_LIST_SELECTORS = [
  'div.tableList.scrap-list',
  '.scrap-list',
  '.tableList',
]

/**
 * 잡코리아 스크랩 페이지에서 스크랩 목록 파싱
 */
function parseJobkoreaScrapList(): ParsedApplication[] {
  const applications: ParsedApplication[] = []

  // 정확한 셀렉터: div.tableList.scrap-list .col.infoCol
  const infoItems = document.querySelectorAll('div.tableList.scrap-list .col.infoCol')
  console.log(`[Jobkorea Parser] Found ${infoItems.length} .col.infoCol items`)

  if (infoItems.length > 0) {
    infoItems.forEach((item) => {
      const app = parseInfoColItem(item)
      if (app) {
        applications.push(app)
      }
    })
    return applications
  }

  // fallback: .infoCol만 사용
  const fallbackItems = document.querySelectorAll('.infoCol')
  console.log(`[Jobkorea Parser] Fallback: Found ${fallbackItems.length} .infoCol items`)

  if (fallbackItems.length > 0) {
    fallbackItems.forEach((item) => {
      const app = parseInfoColItem(item)
      if (app) {
        applications.push(app)
      }
    })
    return applications
  }

  return applications
}

/**
 * .col.infoCol 요소에서 데이터 추출
 */
function parseInfoColItem(item: Element): ParsedApplication | null {
  // 공고 제목 (포지션): strong.titArea > a[href*="/Recruit/GI_Read"]
  const positionEl = item.querySelector('strong.titArea a[href*="/Recruit/GI_Read"]') ||
                     item.querySelector('a[href*="/Recruit/GI_Read"]') ||
                     item.querySelector('.titArea a')
  const position = positionEl?.textContent?.trim() || ''

  // 공고 URL
  let sourceUrl = ''
  if (positionEl) {
    const href = positionEl.getAttribute('href') || ''
    sourceUrl = href.startsWith('http') ? href : `https://www.jobkorea.co.kr${href}`
  }

  // 회사명: 부모 요소에서 a[href*="/Co_read"] 찾기
  // infoCol의 부모(row)에서 회사 링크 찾기
  const parentRow = item.closest('form') || item.parentElement
  const companyEl = parentRow?.querySelector('a[href*="/Co_read"]') ||
                    parentRow?.querySelector('a[href*="/Recruit/Co_Read"]') ||
                    item.querySelector('ul.list-inline li:first-child a')
  const companyName = companyEl?.textContent?.trim() || ''

  console.log(`[Jobkorea Parser] Parsed: company="${companyName}", position="${position}", url="${sourceUrl}"`)

  if (!position) {
    return null
  }

  return {
    companyName: companyName || '알 수 없음',
    position,
    savedAt: new Date().toISOString().split('T')[0],
    sourceUrl,
    platform: 'jobkorea',
  }
}

/**
 * 중복 제거
 */
function deduplicateApplications(applications: ParsedApplication[]): ParsedApplication[] {
  const seen = new Set<string>()
  return applications.filter(app => {
    const key = app.sourceUrl || `${app.companyName}-${app.position}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * 메인 파싱 로직
 */
async function main(): Promise<void> {
  console.log('[Jobkorea Parser] 잡코리아 스크랩 페이지 감지')

  showOverlay('스크랩 공고 수집 중...')

  try {
    await waitForDOM()

    const hasScrapList = await waitForSelector(SCRAP_LIST_SELECTORS)

    if (!hasScrapList) {
      showOverlay('스크랩 공고가 없거나 페이지를 찾을 수 없습니다', 'error')
      hideOverlay()
      await sendParseResult('jobkorea', [], '스크랩 목록을 찾을 수 없습니다')
      return
    }

    // DOM에서 스크랩 파싱
    let applications = parseJobkoreaScrapList()

    // 중복 제거
    applications = deduplicateApplications(applications)

    if (applications.length === 0) {
      showOverlay('스크랩 공고가 없습니다', 'success')
      hideOverlay()
      await sendParseResult('jobkorea', [])
      return
    }

    showOverlay(`${applications.length}개의 스크랩 공고를 찾았습니다`, 'success')
    hideOverlay()

    await sendParseResult('jobkorea', applications)

    console.log('[Jobkorea Parser] Parsed scraps:', applications)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    console.error('[Jobkorea Parser] Error:', error)

    showOverlay(`파싱 실패: ${errorMessage}`, 'error')
    hideOverlay()

    await sendParseResult('jobkorea', [], errorMessage)
  }
}

// 페이지 로드 시 자동 실행
main()
