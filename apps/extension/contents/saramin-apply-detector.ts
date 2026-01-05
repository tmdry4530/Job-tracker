import type { PlasmoCSConfig } from 'plasmo'
import type { ParsedApplication, ParseMessage, JdCollectMessage } from '~lib/types'

export const config: PlasmoCSConfig = {
  matches: [
    'https://www.saramin.co.kr/zf_info/*',
    'https://www.saramin.co.kr/recruit/*',
  ],
  run_at: 'document_idle',
}

/**
 * 사람인 공고 페이지 JD 수집 + 지원완료 자동 감지
 * - 페이지 로드 시 JD 내용 수집
 * - 채용공고 페이지에서 지원 완료 모달/메시지 감지
 * - MutationObserver로 DOM 변화 감지
 */

let isDetecting = false
let observer: MutationObserver | null = null
let jdCollected = false

/**
 * 지원 완료 메시지 감지
 */
function detectApplicationSuccess(): boolean {
  const successPatterns = [
    '지원이 완료되었습니다',
    '지원 완료',
    '입사지원이 완료',
    '성공적으로 지원',
    '지원이 접수되었습니다',
    '정상적으로 지원',
  ]

  const bodyText = document.body.innerText

  for (const pattern of successPatterns) {
    if (bodyText.includes(pattern)) {
      return true
    }
  }

  // 모달/팝업/레이어 확인
  const successElements = document.querySelectorAll([
    '[class*="complete"]',
    '[class*="success"]',
    '.layer_pop',
    '.popup',
    '[role="dialog"]',
    '[role="alert"]',
  ].join(','))

  for (const element of successElements) {
    const text = element.textContent || ''
    for (const pattern of successPatterns) {
      if (text.includes(pattern)) {
        return true
      }
    }
  }

  return false
}

/**
 * 현재 페이지에서 공고 정보 추출
 */
function extractJobInfo(): ParsedApplication | null {
  try {
    // 회사명 추출
    const companyName = extractText([
      '.company_name',
      '.name_company',
      '[class*="corp_name"]',
      '.tit_company',
      'h1 + .company',
    ])

    // 포지션명 추출
    const position = extractText([
      '.job_tit',
      '.tit_job',
      '[class*="title"]',
      'h1.tit',
      '.recruit_title',
    ])

    const sourceUrl = window.location.href

    if (!companyName && !position) {
      console.log('[Saramin Detector] Could not extract job info')
      return null
    }

    return {
      companyName: companyName || '알 수 없음',
      position: position || '알 수 없음',
      appliedAt: new Date().toISOString().split('T')[0],
      status: 'applied',
      sourceUrl,
      platform: 'saramin',
    }
  } catch (error) {
    console.error('[Saramin Detector] Error extracting job info:', error)
    return null
  }
}

/**
 * 텍스트 추출 헬퍼
 */
function extractText(selectors: string[]): string {
  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element?.textContent?.trim()) {
      return element.textContent.trim()
    }
  }
  return ''
}

/**
 * Background로 파싱 결과 전송
 */
async function sendDetectedApplication(application: ParsedApplication): Promise<void> {
  const message: ParseMessage = {
    type: 'PARSE_COMPLETED',
    payload: {
      platform: 'saramin',
      applications: [application],
      timestamp: Date.now(),
    },
  }

  try {
    await chrome.runtime.sendMessage(message)
    console.log('[Saramin Detector] Application sent to background')
    showNotification('새 지원이 감지되었습니다!')
  } catch (error) {
    console.error('[Saramin Detector] Failed to send application:', error)
  }
}

/**
 * 알림 표시
 */
function showNotification(message: string): void {
  const notification = document.createElement('div')
  notification.id = 'job-tracker-notification'
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10B981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    ">
      ✓ ${message}
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
  `
  document.body.appendChild(notification)

  setTimeout(() => {
    notification.style.transition = 'opacity 0.3s'
    notification.style.opacity = '0'
    setTimeout(() => notification.remove(), 300)
  }, 3000)
}

/**
 * DOM 변화 감지 시작
 */
function startDetection(): void {
  if (isDetecting) return
  isDetecting = true

  console.log('[Saramin Detector] Starting application detection')

  let detectedOnce = false

  observer = new MutationObserver(() => {
    if (detectedOnce) return

    if (detectApplicationSuccess()) {
      detectedOnce = true
      console.log('[Saramin Detector] Application success detected!')

      const application = extractJobInfo()
      if (application) {
        sendDetectedApplication(application)
      }

      setTimeout(() => {
        stopDetection()
      }, 1000)
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  // 5분 후 자동 중지
  setTimeout(() => {
    stopDetection()
  }, 300000)
}

/**
 * DOM 변화 감지 중지
 */
function stopDetection(): void {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  isDetecting = false
  console.log('[Saramin Detector] Detection stopped')
}

/**
 * JD 내용 추출
 */
function extractJdContent(): string {
  // 사람인 JD 섹션 셀렉터
  const jdSelectors = [
    '.job_description',
    '.recruit_content',
    '.jv_cont',
    '.cont_jv',
    '[class*="job-description"]',
    '.wrap_jv_detail',
    '#job_content',
  ]

  for (const selector of jdSelectors) {
    const element = document.querySelector(selector)
    if (element?.textContent?.trim()) {
      return element.textContent.trim()
    }
  }

  // 폴백: 본문 영역에서 텍스트 추출
  const content = document.querySelector('.wrap_detail') || document.querySelector('main')
  if (content) {
    const clone = content.cloneNode(true) as HTMLElement
    clone.querySelectorAll('header, button, nav, footer, .btn, .aside').forEach(el => el.remove())
    const text = clone.textContent?.trim() || ''
    if (text.length > 200) {
      return text
    }
  }

  return ''
}

/**
 * JD 수집 및 전송
 */
async function collectAndSendJd(): Promise<void> {
  if (jdCollected) return

  // DOM 안정화 대기
  await new Promise(resolve => setTimeout(resolve, 2000))

  const companyName = extractText([
    '.company_name',
    '.name_company',
    '[class*="corp_name"]',
    '.tit_company',
  ])

  const position = extractText([
    '.job_tit',
    '.tit_job',
    'h1.tit',
    '.recruit_title',
    'h1',
  ])

  const jdContent = extractJdContent()

  if (!companyName || !position) {
    console.log('[Saramin JD] Could not extract company/position')
    return
  }

  if (!jdContent || jdContent.length < 100) {
    console.log('[Saramin JD] JD content too short or empty')
    return
  }

  const message: JdCollectMessage = {
    type: 'JD_COLLECTED',
    payload: {
      platform: 'saramin',
      companyName,
      position,
      jdContent,
      sourceUrl: window.location.href,
      timestamp: Date.now(),
    },
  }

  try {
    await chrome.runtime.sendMessage(message)
    jdCollected = true
    console.log(`[Saramin JD] JD collected for ${companyName} - ${position}`)
    showNotification('JD가 수집되었습니다!')
  } catch (error) {
    console.error('[Saramin JD] Failed to send JD:', error)
  }
}

// 페이지 로드 시 JD 수집 및 지원 감지 시작
collectAndSendJd()
startDetection()
