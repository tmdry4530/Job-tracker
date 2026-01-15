import type { PlasmoCSConfig } from 'plasmo'
import type { ParsedApplication } from '~lib/types'
import { showOverlay, hideOverlay } from '~lib/overlay'
import { waitForDOM } from '~lib/dom-utils'
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
 * - /wd/{job_id} 링크에서 job_id 추출
 */

/**
 * 북마크 카드에서 데이터 추출
 */
function parseBookmarkCard(card: Element): ParsedApplication | null {
  // 링크 찾기 - /wd/ 패턴
  const link = card.querySelector('a[href*="/wd/"]') as HTMLAnchorElement
  if (!link) {
    console.log('[Wanted Parser] No /wd/ link found in card')
    return null
  }

  const sourceUrl = link.href

  // 정확한 셀렉터로 데이터 추출
  // 포지션: wds-component="card-title" 속성을 가진 요소
  const positionEl = card.querySelector('[wds-component="card-title"]') ||
                     card.querySelector('p[class*="card-title"]')

  // 회사명: CompanyNameWithLocationPeriod__company 클래스를 포함하는 요소
  const companyEl = card.querySelector('[class*="CompanyNameWithLocationPeriod__company"]') ||
                    card.querySelector('[class*="__company"]')

  const position = positionEl?.textContent?.trim() || '포지션 정보 없음'
  const companyName = companyEl?.textContent?.trim() || '회사명 없음'

  console.log('[Wanted Parser] Parsed:', { position, companyName, sourceUrl })

  return {
    companyName,
    position,
    savedAt: new Date().toISOString().split('T')[0],
    sourceUrl,
    platform: 'wanted',
  }
}

/**
 * 원티드 북마크 페이지에서 북마크 목록 파싱
 */
function parseWantedBookmarks(): ParsedApplication[] {
  const applications: ParsedApplication[] = []

  // 방법 1: /wd/ 링크가 있는 모든 li 요소 찾기
  const allLinks = document.querySelectorAll('a[href*="/wd/"]')
  console.log(`[Wanted Parser] Found ${allLinks.length} /wd/ links`)

  // 각 링크의 부모 li 또는 카드 컨테이너 찾기
  const processedUrls = new Set<string>()

  allLinks.forEach(link => {
    const href = (link as HTMLAnchorElement).href
    if (processedUrls.has(href)) return
    processedUrls.add(href)

    // 가장 가까운 li 부모 찾기
    const card = link.closest('li') || link.parentElement
    if (!card) return

    const app = parseBookmarkCard(card)
    if (app) {
      applications.push(app)
    }
  })

  return applications
}

/**
 * 셀렉터로 요소 대기
 */
async function waitForBookmarks(timeoutMs: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now()

    const check = () => {
      const links = document.querySelectorAll('a[href*="/wd/"]')
      if (links.length > 0) {
        resolve(true)
        return
      }

      if (Date.now() - startTime >= timeoutMs) {
        resolve(false)
        return
      }

      setTimeout(check, 300)
    }

    check()
  })
}

/**
 * 메인 파싱 로직
 */
async function main(): Promise<void> {
  console.log('[Wanted Parser] 원티드 북마크 페이지 감지')

  showOverlay('북마크 공고 수집 중...')

  try {
    await waitForDOM()

    // 북마크 링크가 나타날 때까지 대기
    const hasBookmarks = await waitForBookmarks(8000)

    if (!hasBookmarks) {
      showOverlay('북마크 공고가 없거나 페이지를 찾을 수 없습니다', 'error')
      hideOverlay()
      await sendParseResult('wanted', [], '북마크 목록을 찾을 수 없습니다')
      return
    }

    // DOM에서 북마크 파싱
    const applications = parseWantedBookmarks()

    if (applications.length === 0) {
      showOverlay('북마크 공고가 없습니다', 'success')
      hideOverlay()
      await sendParseResult('wanted', [])
      return
    }

    showOverlay(`${applications.length}개의 북마크 공고를 찾았습니다`, 'success')
    hideOverlay()

    await sendParseResult('wanted', applications)

    console.log('[Wanted Parser] Parsed bookmarks:', applications)

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
