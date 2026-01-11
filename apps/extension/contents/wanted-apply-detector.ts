import type { PlasmoCSConfig } from 'plasmo'
import type { ParsedApplication, ParseMessage, JdCollectMessage } from '~lib/types'

export const config: PlasmoCSConfig = {
  matches: [
    'https://www.wanted.co.kr/wd/*',
    'https://www.wanted.co.kr/position/*',
    'https://www.wanted.co.kr/company/*',
  ],
  run_at: 'document_idle',
}

/**
 * 원티드 공고 페이지 JD 수집 + 지원완료 자동 감지
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
  // 지원 완료 관련 텍스트 패턴
  const successPatterns = [
    '지원이 완료되었습니다',
    '지원 완료',
    '성공적으로 지원',
    'Successfully applied',
    '지원이 접수되었습니다',
  ]

  const bodyText = document.body.innerText

  for (const pattern of successPatterns) {
    if (bodyText.includes(pattern)) {
      return true
    }
  }

  // 모달/토스트 요소 확인
  const successElements = document.querySelectorAll([
    '[class*="success"]',
    '[class*="complete"]',
    '[class*="toast"]',
    '[role="alert"]',
    '.Modal',
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
      '[class*="CompanyName"]',
      '[class*="company_name"]',
      'header [class*="company"]',
      '[data-company-name]',
      'h1 + div',
    ])

    // 포지션명 추출
    const position = extractText([
      '[class*="JobHeader"] h1',
      '[class*="job-header"] h1',
      'main h1',
      '[class*="position-title"]',
      'h1',
    ])

    // 현재 URL이 공고 URL
    const sourceUrl = window.location.href

    if (!companyName && !position) {
      console.log('[Wanted Detector] Could not extract job info')
      return null
    }

    return {
      companyName: companyName || '알 수 없음',
      position: position || '알 수 없음',
      appliedAt: new Date().toISOString().split('T')[0],
      status: 'applied',
      sourceUrl,
      platform: 'wanted',
    }
  } catch (error) {
    console.error('[Wanted Detector] Error extracting job info:', error)
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
      platform: 'wanted',
      applications: [application],
      timestamp: Date.now(),
    },
  }

  try {
    await chrome.runtime.sendMessage(message)
    console.log('[Wanted Detector] Application sent to background')
    showNotification('새 지원이 감지되었습니다!')
  } catch (error) {
    console.error('[Wanted Detector] Failed to send application:', error)
  }
}

/**
 * 알림 표시
 * XSS 방지를 위해 DOM API 사용
 */
function showNotification(message: string): void {
  // 기존 알림 제거
  const existingNotification = document.getElementById('job-tracker-notification')
  if (existingNotification) {
    existingNotification.remove()
  }

  // 스타일 요소 추가 (한 번만)
  if (!document.getElementById('job-tracker-notification-styles')) {
    const style = document.createElement('style')
    style.id = 'job-tracker-notification-styles'
    style.textContent = `
      @keyframes job-tracker-slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `
    document.head.appendChild(style)
  }

  const notification = document.createElement('div')
  notification.id = 'job-tracker-notification'

  const container = document.createElement('div')
  Object.assign(container.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: '#10B981',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '8px',
    zIndex: '10000',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    animation: 'job-tracker-slideIn 0.3s ease',
  })

  container.textContent = `✓ ${message}`

  notification.appendChild(container)
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

  console.log('[Wanted Detector] Starting application detection')

  let detectedOnce = false

  observer = new MutationObserver(() => {
    if (detectedOnce) return

    if (detectApplicationSuccess()) {
      detectedOnce = true
      console.log('[Wanted Detector] Application success detected!')

      const application = extractJobInfo()
      if (application) {
        sendDetectedApplication(application)
      }

      // 감지 완료 후 옵저버 중지
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

  // 5분 후 자동 중지 (리소스 절약)
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
  console.log('[Wanted Detector] Detection stopped')
}

/**
 * "더 보기" 버튼 클릭하여 전체 내용 펼치기
 */
async function expandFullContent(): Promise<boolean> {
  // "더 보기" 버튼 찾기
  const expandButtonSelectors = [
    'button[class*="more"]',
    'button[class*="More"]',
    'button[class*="expand"]',
    'button[class*="Expand"]',
    '[class*="JobDescription"] button',
    '[class*="job-description"] button',
  ]

  for (const selector of expandButtonSelectors) {
    const buttons = document.querySelectorAll(selector)
    for (const button of buttons) {
      const text = button.textContent?.trim() || ''
      if (text.includes('상세 정보 더 보기') || text.includes('상세정보 더 보기') || text.includes('펼치기')) {
        console.log('[Wanted JD] Found expand button:', text)
        ;(button as HTMLElement).click()
        // 클릭 후 콘텐츠 로드 대기
        await new Promise(resolve => setTimeout(resolve, 500))
        return true
      }
    }
  }

  // 텍스트로 직접 찾기
  const allButtons = document.querySelectorAll('button')
  for (const button of allButtons) {
    const text = button.textContent?.trim() || ''
    if (text.includes('상세 정보 더 보기') || text.includes('상세정보 더 보기') || text === '더 보기') {
      console.log('[Wanted JD] Found expand button by text:', text)
      ;(button as HTMLElement).click()
      await new Promise(resolve => setTimeout(resolve, 500))
      return true
    }
  }

  console.log('[Wanted JD] No expand button found')
  return false
}

/**
 * JD 내용 추출
 */
function extractJdContent(): string {
  // 원티드 JD 섹션 셀렉터
  const jdSelectors = [
    '[class*="JobDescription"]',
    '[class*="job-description"]',
    '[class*="JobContent"]',
    '[class*="job_description"]',
    '[data-cy="job-description"]',
    'section[class*="Description"]',
    '.job-content',
  ]

  for (const selector of jdSelectors) {
    const element = document.querySelector(selector)
    if (element?.textContent?.trim()) {
      return element.textContent.trim()
    }
  }

  // 폴백: main 영역에서 텍스트 추출
  const main = document.querySelector('main')
  if (main) {
    // 헤더, 버튼 등 제외하고 본문만
    const clone = main.cloneNode(true) as HTMLElement
    clone.querySelectorAll('header, button, nav, footer').forEach(el => el.remove())
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

  // "더 보기" 버튼 클릭하여 전체 내용 펼치기
  const expanded = await expandFullContent()
  if (expanded) {
    // 펼쳐진 후 추가 대기
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  const companyName = extractText([
    'header a[href*="/company/"]',
    'a[href*="/company/"]',
    '[class*="company-name"]',
    '[class*="company_name"]',
  ])

  const position = extractText([
    '[class*="JobHeader"] h1',
    '[class*="job-header"] h1',
    'h1[class*="title"]',
    'main h1',
    'h1',
  ])

  const jdContent = extractJdContent()

  console.log(`[Wanted JD] Extracted - Company: ${companyName}, Position: ${position}, JD Length: ${jdContent.length}`)

  if (!companyName || !position) {
    console.log('[Wanted JD] Could not extract company/position')
    return
  }

  if (!jdContent || jdContent.length < 100) {
    console.log('[Wanted JD] JD content too short or empty')
    return
  }

  const message: JdCollectMessage = {
    type: 'JD_COLLECTED',
    payload: {
      platform: 'wanted',
      companyName,
      position,
      jdContent,
      sourceUrl: window.location.href,
      timestamp: Date.now(),
    },
  }

  try {
    console.log('[Wanted JD] Sending message to background...')
    const response = await chrome.runtime.sendMessage(message)
    console.log('[Wanted JD] Response from background:', response)
    jdCollected = true
    console.log(`[Wanted JD] JD collected for ${companyName} - ${position}`)
    showNotification('JD가 수집되었습니다!')
  } catch (error) {
    console.error('[Wanted JD] Failed to send JD:', error)
    console.error('[Wanted JD] chrome.runtime.lastError:', chrome.runtime.lastError)
  }
}

/**
 * URL 변경 감지 (SPA 네비게이션 대응)
 */
function setupUrlChangeDetection(): void {
  let lastUrl = window.location.href

  // popstate 이벤트 (뒤로가기/앞으로가기)
  window.addEventListener('popstate', () => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      handleUrlChange()
    }
  })

  // pushState/replaceState 감지를 위한 MutationObserver
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      handleUrlChange()
    }
  })

  urlObserver.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // History API 오버라이드
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState

  history.pushState = function (...args) {
    originalPushState.apply(this, args)
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      handleUrlChange()
    }
  }

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args)
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      handleUrlChange()
    }
  }
}

/**
 * URL 변경 시 처리
 */
function handleUrlChange(): void {
  const url = window.location.href

  // 공고 상세 페이지인 경우 JD 수집
  if (url.includes('/wd/') || url.includes('/position/')) {
    console.log('[Wanted Detector] URL changed to job detail page:', url)
    jdCollected = false // 새 페이지이므로 리셋
    collectAndSendJd()
    startDetection()
  }
}

// 페이지 로드 시 JD 수집 및 지원 감지 시작
collectAndSendJd()
startDetection()
setupUrlChangeDetection()
