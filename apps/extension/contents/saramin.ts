import type { PlasmoCSConfig } from 'plasmo'
import type { ParsedApplication } from '~lib/types'
import { showOverlay, hideOverlay } from '~lib/overlay'
import { waitForDOM, waitForSelector, extractText, extractLink } from '~lib/dom-utils'
import { sendParseResult } from '~lib/parse-result'

export const config: PlasmoCSConfig = {
  matches: [
    'https://www.saramin.co.kr/zf_user/persons/scrap-recruit*',
    'https://www.saramin.co.kr/zf_user/scrap*',
  ],
  run_at: 'document_idle',
}

/**
 * 사람인 스크랩 페이지 파서
 * - URL: https://www.saramin.co.kr/zf_user/persons/scrap-recruit
 * - DOM에서 스크랩한 공고 목록을 파싱하여 Background로 전달
 * - 페이지네이션 지원: 모든 페이지의 스크랩 내역 수집
 */

/** 지원 목록 컨테이너 셀렉터 */
const APPLICATION_LIST_SELECTORS = [
  '.apply_list',
  '.list_apply',
  '[class*="apply"]',
  'table.list',
  '.content_list',
  '.list_status',
]

/** 페이지네이션 정보 */
interface PaginationInfo {
  currentPage: number
  totalPages: number
  /** URL 경로에 /page/{num} 형태인 경우 true */
  isPathBased: boolean
  /** 쿼리 파라미터 (경로 기반일 때 유지해야 함) */
  queryString: string
  /** 경로 기반이 아닐 때 사용할 base URL */
  baseUrl: string
}

/**
 * URL에서 현재 페이지 번호 추출
 * 사람인은 /page/{num} 형태의 경로 기반 페이지네이션 사용
 */
function extractCurrentPageFromUrl(): { currentPage: number; isPathBased: boolean } {
  const url = window.location.href

  // 경로에서 /page/{num} 패턴 찾기
  const pathMatch = url.match(/\/page\/(\d+)/)
  if (pathMatch) {
    return {
      currentPage: parseInt(pathMatch[1], 10),
      isPathBased: true,
    }
  }

  // 쿼리 파라미터에서 page 찾기 (fallback)
  const urlObj = new URL(url)
  const pageParam = urlObj.searchParams.get('page')
  if (pageParam) {
    return {
      currentPage: parseInt(pageParam, 10),
      isPathBased: false,
    }
  }

  return { currentPage: 1, isPathBased: false }
}

/**
 * 특정 페이지의 URL 생성
 */
function buildPageUrl(pagination: PaginationInfo, pageNum: number): string {
  if (pagination.isPathBased) {
    // 경로 기반: /page/{num} 부분만 교체
    const currentUrl = window.location.href
    const newUrl = currentUrl.replace(/\/page\/\d+/, `/page/${pageNum}`)
    return newUrl
  } else {
    // 쿼리 파라미터 기반
    const url = new URL(pagination.baseUrl)
    url.searchParams.set('page', String(pageNum))
    return url.toString()
  }
}

/**
 * 페이지네이션 정보 추출
 */
function extractPaginationInfo(): PaginationInfo {
  const { currentPage, isPathBased } = extractCurrentPageFromUrl()

  const url = new URL(window.location.href)
  const queryString = url.search

  // 기본 URL (쿼리 파라미터 기반일 때 사용)
  url.searchParams.delete('page')
  const baseUrl = url.toString()

  // 총 페이지 수 추출
  let totalPages = 1

  console.log('[Saramin Parser] Searching for pagination elements...')
  console.log(`[Saramin Parser] Current URL: ${window.location.href}`)
  console.log(`[Saramin Parser] Path-based pagination: ${isPathBased}, Current page: ${currentPage}`)

  // 방법 1: 페이지 내 모든 링크에서 /page/{num} 패턴 찾기
  const allLinks = document.querySelectorAll('a[href*="/page/"]')
  console.log(`[Saramin Parser] Found ${allLinks.length} links with /page/ pattern`)

  allLinks.forEach((link) => {
    const href = link.getAttribute('href') || ''
    const pathMatch = href.match(/\/page\/(\d+)/)
    if (pathMatch) {
      const pageNum = parseInt(pathMatch[1], 10)
      if (pageNum > totalPages) {
        totalPages = pageNum
        console.log(`[Saramin Parser] Found page ${pageNum} from link: ${href}`)
      }
    }
  })

  // 방법 2: 페이지네이션 영역에서 찾기
  if (totalPages === 1) {
    const paginationSelectors = [
      '.wrap_paging a',
      '.pagination a',
      '.paging a',
      '[class*="paging"] a',
      '.page_wrap a',
    ]

    for (const selector of paginationSelectors) {
      const pageLinks = document.querySelectorAll(selector)
      if (pageLinks.length > 0) {
        console.log(`[Saramin Parser] Found ${pageLinks.length} page links with: ${selector}`)

        pageLinks.forEach((link) => {
          const href = link.getAttribute('href') || ''
          const text = link.textContent?.trim() || ''

          // 경로에서 /page/{num} 추출
          const pathMatch = href.match(/\/page\/(\d+)/)
          if (pathMatch) {
            const pageNum = parseInt(pathMatch[1], 10)
            if (pageNum > totalPages) totalPages = pageNum
          }

          // 텍스트가 숫자인 경우 (페이지 번호)
          const numMatch = text.match(/^\d+$/)
          if (numMatch) {
            const pageNum = parseInt(text, 10)
            if (pageNum > totalPages) totalPages = pageNum
          }
        })
        break
      }
    }
  }

  // 방법 3: 전체 건수에서 페이지 수 계산
  if (totalPages === 1) {
    // 다양한 셀렉터로 전체 건수 찾기
    const totalCountSelectors = [
      '.total_count',
      '.count_num',
      '.total_info',
      '.info_count',
      '.cnt_total',
      '.result_count',
      '[class*="total"]',
      '[class*="count"]',
    ]

    for (const selector of totalCountSelectors) {
      const elements = document.querySelectorAll(selector)
      for (const countEl of elements) {
        const text = countEl.textContent || ''
        // "총 21건", "전체 21", "21개" 등의 패턴 찾기
        const countMatch = text.match(/(?:총|전체|Total)?\s*(\d+)\s*(?:건|개|件)?/i)
        if (countMatch) {
          const totalCount = parseInt(countMatch[1], 10)
          if (totalCount > 20) {
            totalPages = Math.ceil(totalCount / 20)
            console.log(`[Saramin Parser] Calculated pages from total count "${text}" (${totalCount}): ${totalPages}`)
            break
          }
        }
      }
      if (totalPages > 1) break
    }
  }

  // 방법 4: 현재 표시된 아이템 수로 추정
  if (totalPages === 1) {
    const itemSelectors = [
      '.list_status .row',
      '.wrap_list .row',
      '.apply_list > li',
      'table.list tbody tr',
    ]

    for (const selector of itemSelectors) {
      const items = document.querySelectorAll(selector)
      // 정확히 20개면 다음 페이지가 있을 가능성 높음
      if (items.length === 20) {
        totalPages = 2 // 최소 2페이지로 가정
        console.log(`[Saramin Parser] Found exactly 20 items, assuming at least 2 pages`)
        break
      }
    }
  }

  console.log(`[Saramin Parser] Pagination: page ${currentPage}/${totalPages}, isPathBased: ${isPathBased}`)

  return { currentPage, totalPages, isPathBased, queryString, baseUrl }
}

/**
 * 특정 페이지의 HTML에서 지원 내역 파싱
 */
function parseApplicationsFromHtml(html: string): ParsedApplication[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const applications: ParsedApplication[] = []

  // 디버깅: HTML 일부 출력
  console.log(`[Saramin Parser] Fetched HTML length: ${html.length}`)
  console.log(`[Saramin Parser] HTML preview: ${html.substring(0, 500)}...`)

  const selectors = [
    '.list_status .row._apply_list',
    '.list_status .row',
    '.wrap_list .row',
    '.apply_list > li',
    '.list_apply > li',
    'table.list tbody tr',
  ]

  let applicationItems: NodeListOf<Element> | null = null
  let matchedSelector = ''

  for (const selector of selectors) {
    const items = doc.querySelectorAll(selector)
    console.log(`[Saramin Parser] Selector "${selector}": ${items.length} items`)
    if (items.length > 0) {
      applicationItems = items
      matchedSelector = selector
      break
    }
  }

  if (!applicationItems) {
    console.log('[Saramin Parser] No items found in fetched HTML')
    // 디버깅: body 내용 일부 확인
    const body = doc.querySelector('body')
    if (body) {
      console.log(`[Saramin Parser] Body classes: ${body.className}`)
      console.log(`[Saramin Parser] Body children: ${body.children.length}`)
    }
    return applications
  }

  console.log(`[Saramin Parser] Found ${applicationItems.length} items with: ${matchedSelector}`)

  for (const item of applicationItems) {
    try {
      const application = parseApplicationItemFromElement(item)
      if (application) {
        applications.push(application)
      }
    } catch (error) {
      console.error('[Saramin Parser] Failed to parse item from HTML:', error)
    }
  }

  return applications
}

/**
 * Element에서 지원 항목 파싱 (DOM parser용)
 * 사람인 스크랩 페이지는 class 없이 semantic HTML 사용
 */
function parseApplicationItemFromElement(item: Element): ParsedApplication | null {
  // rec_idx를 포함하는 링크들 찾기
  const jobLinks = item.querySelectorAll('a[href*="rec_idx"]')

  let companyName = ''
  let position = ''
  let sourceUrl = ''

  if (jobLinks.length >= 2) {
    companyName = jobLinks[0].textContent?.trim() || ''
    position = jobLinks[1].textContent?.trim() || ''
    const href = jobLinks[0].getAttribute('href') || ''
    sourceUrl = href.startsWith('http') ? href : `https://www.saramin.co.kr${href}`
  } else if (jobLinks.length === 1) {
    position = jobLinks[0].textContent?.trim() || ''
    const href = jobLinks[0].getAttribute('href') || ''
    sourceUrl = href.startsWith('http') ? href : `https://www.saramin.co.kr${href}`
  }

  // fallback
  if (!companyName) {
    const el = item.querySelector('.corp a, .corp, .company_name')
    companyName = el?.textContent?.trim() || ''
  }
  if (!position) {
    const el = item.querySelector('.recruit a, .job_tit a, .job_tit')
    position = el?.textContent?.trim() || ''
  }

  if (!companyName && !position) {
    return null
  }

  return {
    companyName: companyName || '알 수 없음',
    position: position || '알 수 없음',
    savedAt: new Date().toISOString().split('T')[0],
    sourceUrl: sourceUrl || '',
    platform: 'saramin',
  }
}

/**
 * 특정 페이지 fetch
 */
async function fetchPage(pagination: PaginationInfo, page: number): Promise<string> {
  const pageUrl = buildPageUrl(pagination, page)
  console.log(`[Saramin Parser] Fetching page ${page}: ${pageUrl}`)

  const response = await fetch(pageUrl, {
    credentials: 'include', // 쿠키 포함 (로그인 세션 유지)
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch page ${page}: ${response.status}`)
  }

  return response.text()
}

/**
 * 모든 페이지에서 지원 내역 수집
 */
async function fetchAllPages(pagination: PaginationInfo): Promise<ParsedApplication[]> {
  const allApplications: ParsedApplication[] = []

  // 현재 페이지 파싱 (이미 로드된 DOM 사용)
  const currentPageApps = parseSaraminApplications()
  allApplications.push(...currentPageApps)
  console.log(`[Saramin Parser] Page ${pagination.currentPage}: ${currentPageApps.length} items`)

  // 나머지 페이지들 fetch
  for (let page = 1; page <= pagination.totalPages; page++) {
    if (page === pagination.currentPage) continue // 현재 페이지는 스킵

    try {
      showOverlay(`지원 내역 수집 중... (${page}/${pagination.totalPages} 페이지)`)

      const html = await fetchPage(pagination, page)
      const pageApps = parseApplicationsFromHtml(html)
      allApplications.push(...pageApps)

      console.log(`[Saramin Parser] Page ${page}: ${pageApps.length} items`)

      // 과도한 요청 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error(`[Saramin Parser] Failed to fetch page ${page}:`, error)
    }
  }

  return allApplications
}

/**
 * 사람인 지원현황 페이지에서 지원 내역 파싱 (현재 페이지만)
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
 * 개별 북마크 항목 파싱
 * 사람인 스크랩 페이지는 class 없이 semantic HTML 사용
 * - 첫 번째 <a href*="rec_idx"> = 회사명
 * - 두 번째 <a href*="rec_idx"> = 포지션
 */
function parseApplicationItem(item: Element): ParsedApplication | null {
  // rec_idx를 포함하는 링크들 찾기 (회사명, 포지션 순서)
  const jobLinks = item.querySelectorAll('a[href*="rec_idx"]')

  let companyName = ''
  let position = ''
  let sourceUrl = ''

  if (jobLinks.length >= 2) {
    // 첫 번째 링크 = 회사명, 두 번째 링크 = 포지션
    companyName = jobLinks[0].textContent?.trim() || ''
    position = jobLinks[1].textContent?.trim() || ''
    sourceUrl = (jobLinks[0] as HTMLAnchorElement).href || ''
  } else if (jobLinks.length === 1) {
    // 링크가 하나면 포지션으로 처리
    position = jobLinks[0].textContent?.trim() || ''
    sourceUrl = (jobLinks[0] as HTMLAnchorElement).href || ''
  }

  // fallback: 기존 셀렉터 시도
  if (!companyName) {
    companyName = extractText(item, ['.corp a', '.corp', '.company_name'])
  }
  if (!position) {
    position = extractText(item, ['.recruit a', '.job_tit a', '.job_tit', '.title a'])
  }
  if (!sourceUrl) {
    sourceUrl = extractLink(item, ['a[href*="rec_idx"]', 'a'])
  }

  if (!companyName && !position) {
    console.log('[Saramin Parser] Item has no company/position:', item.innerHTML.substring(0, 200))
    return null
  }

  return {
    companyName: companyName || '알 수 없음',
    position: position || '알 수 없음',
    savedAt: new Date().toISOString().split('T')[0],
    sourceUrl: sourceUrl || window.location.href,
    platform: 'saramin',
  }
}

/**
 * 중복 제거
 */
function deduplicateApplications(applications: ParsedApplication[]): ParsedApplication[] {
  const seen = new Set<string>()
  return applications.filter(app => {
    const key = `${app.companyName}-${app.position}-${app.savedAt}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * 메인 파싱 로직
 */
async function main(): Promise<void> {
  console.log('[Saramin Parser] 사람인 스크랩 페이지 감지')

  showOverlay('스크랩 공고 수집 중...')

  try {
    await waitForDOM()

    const hasApplicationList = await waitForSelector(APPLICATION_LIST_SELECTORS)

    if (!hasApplicationList) {
      showOverlay('스크랩 공고가 없거나 페이지를 찾을 수 없습니다', 'error')
      hideOverlay()
      await sendParseResult('saramin', [], '스크랩 목록을 찾을 수 없습니다')
      return
    }

    // 페이지네이션 정보 추출
    const pagination = extractPaginationInfo()

    let applications: ParsedApplication[]

    if (pagination.totalPages > 1) {
      // 여러 페이지가 있으면 모든 페이지 수집
      console.log(`[Saramin Parser] Fetching all ${pagination.totalPages} pages...`)
      applications = await fetchAllPages(pagination)
    } else {
      // 단일 페이지
      applications = parseSaraminApplications()
    }

    // 중복 제거
    applications = deduplicateApplications(applications)

    if (applications.length === 0) {
      showOverlay('스크랩 공고가 없습니다', 'success')
      hideOverlay()
      await sendParseResult('saramin', [])
      return
    }

    const pageInfo = pagination.totalPages > 1 ? ` (${pagination.totalPages}페이지)` : ''
    showOverlay(`${applications.length}개의 스크랩 공고를 찾았습니다${pageInfo}`, 'success')
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
