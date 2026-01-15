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
 * - DOM에서 스크랩한 공고 목록을 파싱하여 Background로 전달
 */

/** 스크랩 목록 컨테이너 셀렉터 */
const SCRAP_LIST_SELECTORS = [
  '.list-default',
  '.list-post',
  '.recruit-info',
  'table.tbl',
  '.tplList',
  '[class*="list"]',
]

/**
 * 잡코리아 스크랩 페이지에서 스크랩 목록 파싱
 */
function parseJobkoreaScrapList(): ParsedApplication[] {
  const applications: ParsedApplication[] = []

  // 방법 1: 테이블 형태의 스크랩 목록
  const tableRows = document.querySelectorAll('table.tbl tbody tr, .list-default tbody tr')
  console.log(`[Jobkorea Parser] Found ${tableRows.length} table rows`)

  if (tableRows.length > 0) {
    tableRows.forEach((row) => {
      const app = parseTableRow(row)
      if (app) {
        applications.push(app)
      }
    })
    return applications
  }

  // 방법 2: 리스트 아이템 형태
  const listItems = document.querySelectorAll('.list-post > li, .recruit-info > li, .tplList > li')
  console.log(`[Jobkorea Parser] Found ${listItems.length} list items`)

  if (listItems.length > 0) {
    listItems.forEach((item) => {
      const app = parseListItem(item)
      if (app) {
        applications.push(app)
      }
    })
    return applications
  }

  // 방법 3: 공고 링크 기반 파싱
  const jobLinks = document.querySelectorAll('a[href*="/Recruit/"], a[href*="/recruit/"]')
  console.log(`[Jobkorea Parser] Found ${jobLinks.length} job links`)

  const processedUrls = new Set<string>()

  jobLinks.forEach((link) => {
    const href = (link as HTMLAnchorElement).href
    if (processedUrls.has(href)) return
    processedUrls.add(href)

    const container = link.closest('tr') || link.closest('li') || link.parentElement
    if (!container) return

    const app = parseGenericContainer(container, href)
    if (app) {
      applications.push(app)
    }
  })

  return applications
}

/**
 * 테이블 행에서 데이터 추출
 */
function parseTableRow(row: Element): ParsedApplication | null {
  // 회사명 찾기
  const companyEl = row.querySelector('.co-name a, .company-name a, td.co a, .name a, [class*="company"] a')
  const companyName = companyEl?.textContent?.trim() || ''

  // 포지션 찾기
  const positionEl = row.querySelector('.job-tit a, .recruit-tit a, td.title a, .tit a, [class*="title"] a, [class*="tit"] a')
  const position = positionEl?.textContent?.trim() || ''

  // URL 찾기
  const linkEl = row.querySelector('a[href*="/Recruit/"], a[href*="/recruit/"]') as HTMLAnchorElement
  let sourceUrl = linkEl?.href || ''

  // URL이 상대 경로인 경우 절대 경로로 변환
  if (sourceUrl && !sourceUrl.startsWith('http')) {
    sourceUrl = `https://www.jobkorea.co.kr${sourceUrl}`
  }

  if (!companyName && !position) {
    return null
  }

  return {
    companyName: companyName || '알 수 없음',
    position: position || '알 수 없음',
    savedAt: new Date().toISOString().split('T')[0],
    sourceUrl,
    platform: 'jobkorea',
  }
}

/**
 * 리스트 아이템에서 데이터 추출
 */
function parseListItem(item: Element): ParsedApplication | null {
  // 회사명 찾기
  const companyEl = item.querySelector('.co-name a, .company a, .name a, [class*="company"] a')
  const companyName = companyEl?.textContent?.trim() || ''

  // 포지션 찾기
  const positionEl = item.querySelector('.job-tit a, .tit a, .title a, [class*="title"] a, h3 a, h4 a')
  const position = positionEl?.textContent?.trim() || ''

  // URL 찾기
  const linkEl = item.querySelector('a[href*="/Recruit/"], a[href*="/recruit/"]') as HTMLAnchorElement
  let sourceUrl = linkEl?.href || ''

  if (sourceUrl && !sourceUrl.startsWith('http')) {
    sourceUrl = `https://www.jobkorea.co.kr${sourceUrl}`
  }

  if (!companyName && !position) {
    return null
  }

  return {
    companyName: companyName || '알 수 없음',
    position: position || '알 수 없음',
    savedAt: new Date().toISOString().split('T')[0],
    sourceUrl,
    platform: 'jobkorea',
  }
}

/**
 * 일반 컨테이너에서 데이터 추출
 */
function parseGenericContainer(container: Element, sourceUrl: string): ParsedApplication | null {
  const links = container.querySelectorAll('a')

  let companyName = ''
  let position = ''

  // 링크 텍스트에서 추출
  links.forEach((link) => {
    const href = link.getAttribute('href') || ''
    const text = link.textContent?.trim() || ''

    if (href.includes('/Recruit/') || href.includes('/recruit/')) {
      if (!position) position = text
    } else if (href.includes('/Corp/') || href.includes('/corp/')) {
      if (!companyName) companyName = text
    }
  })

  // fallback: 첫 번째와 두 번째 링크 사용
  if (!companyName || !position) {
    const linkTexts = Array.from(links).map(l => l.textContent?.trim()).filter(Boolean)
    if (linkTexts.length >= 2) {
      if (!companyName) companyName = linkTexts[0] || ''
      if (!position) position = linkTexts[1] || ''
    } else if (linkTexts.length === 1) {
      if (!position) position = linkTexts[0] || ''
    }
  }

  if (!companyName && !position) {
    return null
  }

  return {
    companyName: companyName || '알 수 없음',
    position: position || '알 수 없음',
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
