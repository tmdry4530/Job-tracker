import type { PlasmoCSConfig } from 'plasmo'
import { showOverlay, hideOverlay } from '~lib/overlay'
import { waitForDOM, waitForSelector } from '~lib/dom-utils'
import { sendParseResult } from '~lib/parse-result'
import {
  SCRAP_LIST_SELECTORS,
  parseJobkoreaScrapList,
  deduplicateApplications,
} from '~lib/jobkorea-parser'

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
 * - 순수 DOM 추출 로직은 ~lib/jobkorea-parser 로 분리 (단위 테스트 대상)
 */

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
