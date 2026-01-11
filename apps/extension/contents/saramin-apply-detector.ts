import type { PlasmoCSConfig } from 'plasmo'
import type { ParsedApplication, ParseMessage, JdCollectMessage } from '~lib/types'

export const config: PlasmoCSConfig = {
  matches: [
    'https://www.saramin.co.kr/zf_info/*',
    'https://www.saramin.co.kr/recruit/*',
    'https://www.saramin.co.kr/zf_user/jobs/relay/view*',
    'https://www.saramin.co.kr/zf_user/jobs/relay/view-detail*',
  ],
  all_frames: true,
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
 * JD 영역이 이미지 기반인지 확인하고 이미지 URL 반환
 */
function checkImageBasedJd(container: Element): { isImage: boolean; imageUrls: string[] } {
  const images = container.querySelectorAll('img')
  const textLength = container.textContent?.trim().length || 0

  // 이미지가 있고 텍스트가 매우 짧으면 이미지 기반으로 판단
  if (images.length > 0 && textLength < 200) {
    const imageUrls: string[] = []
    images.forEach((img) => {
      const src = img.src || img.getAttribute('data-src')
      if (src && src.startsWith('http')) {
        imageUrls.push(src)
      }
    })
    console.log(`[Saramin JD] Image-based JD detected: ${images.length} images, ${imageUrls.length} valid URLs`)
    return { isImage: true, imageUrls }
  }

  // iframe 기반 JD 확인 (일부 회사는 iframe으로 공고 삽입)
  const iframes = container.querySelectorAll('iframe')
  if (iframes.length > 0) {
    console.log(`[Saramin JD] iframe-based JD detected`)
    return { isImage: true, imageUrls: [] }
  }

  return { isImage: false, imageUrls: [] }
}

/**
 * iframe 내부 콘텐츠에서 JD 추출
 */
function extractFromIframe(iframe: HTMLIFrameElement): { content: string; isImage: boolean; imageUrls: string[] } | null {
  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      console.log('[Saramin JD] Cannot access iframe document')
      return null
    }

    // iframe 내부에서 텍스트 추출
    const body = iframeDoc.body
    if (!body) return null

    // 이미지 기반인지 확인
    const images = body.querySelectorAll('img')
    const textContent = body.innerText?.trim() || ''

    console.log(`[Saramin JD] iframe content: ${textContent.length} chars, ${images.length} images`)

    // 이미지가 많고 텍스트가 적으면 이미지 기반
    if (images.length > 0 && textContent.length < 300) {
      const imageUrls: string[] = []
      images.forEach((img) => {
        const src = img.src || img.getAttribute('data-src')
        if (src && src.startsWith('http')) {
          imageUrls.push(src)
        }
      })
      return { content: '[이미지 형식 공고]', isImage: true, imageUrls }
    }

    // 텍스트 기반
    if (textContent.length > 100) {
      return { content: textContent, isImage: false, imageUrls: [] }
    }

    return null
  } catch (error) {
    console.error('[Saramin JD] iframe access error:', error)
    return null
  }
}

/**
 * JD 내용 추출
 */
function extractJdContent(): { content: string; isImage: boolean; imageUrls: string[] } {
  // 1. iframe 확인 (사람인은 대부분 iframe 사용)
  const iframe = document.querySelector('iframe.iframe_content, iframe[id^="iframe_content"]') as HTMLIFrameElement
  if (iframe) {
    console.log('[Saramin JD] Found iframe, attempting to extract content')
    const iframeResult = extractFromIframe(iframe)
    if (iframeResult) {
      return iframeResult
    }
  }

  // 2. 일반 셀렉터로 시도
  const jdSelectors = [
    '.jv_cont.jv_detail',
    '.jv_cont',
    '.job_description',
    '.recruit_content',
    '.cont_jv',
    '[class*="job-description"]',
    '.wrap_jv_detail',
    '#job_content',
    '.user_content',
  ]

  for (const selector of jdSelectors) {
    const element = document.querySelector(selector)
    if (element) {
      // 이미지 기반 JD인지 확인
      const imageCheck = checkImageBasedJd(element)
      if (imageCheck.isImage) {
        return { content: '[이미지 형식 공고]', isImage: true, imageUrls: imageCheck.imageUrls }
      }

      const text = element.textContent?.trim() || ''
      if (text.length > 100) {
        return { content: text, isImage: false, imageUrls: [] }
      }
    }
  }

  // 3. 폴백: 본문 영역에서 텍스트 추출
  const content = document.querySelector('.wrap_detail') || document.querySelector('main')
  if (content) {
    const imageCheck = checkImageBasedJd(content)
    if (imageCheck.isImage) {
      return { content: '[이미지 형식 공고]', isImage: true, imageUrls: imageCheck.imageUrls }
    }

    const clone = content.cloneNode(true) as HTMLElement
    clone.querySelectorAll('header, button, nav, footer, .btn, .aside').forEach(el => el.remove())
    const text = clone.textContent?.trim() || ''
    if (text.length > 200) {
      return { content: text, isImage: false, imageUrls: [] }
    }
  }

  return { content: '', isImage: false, imageUrls: [] }
}

/**
 * iframe 로드 대기
 */
async function waitForIframe(): Promise<HTMLIFrameElement | null> {
  return new Promise((resolve) => {
    let attempts = 0
    const maxAttempts = 20

    const check = () => {
      attempts++
      const iframe = document.querySelector('iframe.iframe_content, iframe[id^="iframe_content"]') as HTMLIFrameElement

      if (iframe) {
        // iframe이 로드될 때까지 대기
        if (iframe.contentDocument?.body) {
          console.log('[Saramin JD] iframe loaded')
          resolve(iframe)
          return
        }

        // load 이벤트 대기
        iframe.addEventListener('load', () => {
          console.log('[Saramin JD] iframe load event fired')
          resolve(iframe)
        }, { once: true })

        // 이미 로드되었을 수 있으니 1초 후 재확인
        setTimeout(() => {
          if (iframe.contentDocument?.body) {
            resolve(iframe)
          }
        }, 1000)
        return
      }

      if (attempts >= maxAttempts) {
        console.log('[Saramin JD] iframe not found after max attempts')
        resolve(null)
        return
      }

      setTimeout(check, 500)
    }

    check()
  })
}

/**
 * JD 수집 및 전송
 */
async function collectAndSendJd(): Promise<void> {
  if (jdCollected) return

  // iframe 안에서 실행되면 무시 (부모 페이지에서만 실행)
  if (window.self !== window.top) {
    console.log('[Saramin JD] Running inside iframe, skipping')
    return
  }

  // DOM 안정화 대기
  await new Promise(resolve => setTimeout(resolve, 2000))

  // iframe 로드 대기
  await waitForIframe()

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

  const jdResult = extractJdContent()

  if (!companyName || !position) {
    console.log('[Saramin JD] Could not extract company/position')
    return
  }

  // 이미지 기반이 아닌 경우에만 텍스트 길이 체크
  if (!jdResult.content || (!jdResult.isImage && jdResult.content.length < 100)) {
    console.log('[Saramin JD] JD content too short or empty')
    return
  }

  const message: JdCollectMessage = {
    type: 'JD_COLLECTED',
    payload: {
      platform: 'saramin',
      companyName,
      position,
      jdContent: jdResult.content,
      sourceUrl: window.location.href,
      timestamp: Date.now(),
      isImageBased: jdResult.isImage,
      imageUrls: jdResult.imageUrls,
    },
  }

  try {
    await chrome.runtime.sendMessage(message)
    jdCollected = true
    console.log(`[Saramin JD] JD collected for ${companyName} - ${position} (isImage: ${jdResult.isImage})`)

    if (jdResult.isImage) {
      showNotification('이미지 형식 공고가 감지되었습니다')
    } else {
      showNotification('JD가 수집되었습니다!')
    }
  } catch (error) {
    console.error('[Saramin JD] Failed to send JD:', error)
  }
}

// 페이지 로드 시 JD 수집 및 지원 감지 시작
collectAndSendJd()
startDetection()
