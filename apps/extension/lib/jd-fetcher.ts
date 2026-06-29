/**
 * JD(Job Description) 수집 유틸리티
 * 원티드, 사람인 공고 상세 페이지에서 JD 추출
 */

import { TIMEOUTS, SYNC, PLATFORM_URLS } from './constants'

/**
 * HTML에서 태그 제거하고 텍스트만 추출
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 텍스트 길이 제한
 */
function truncateText(text: string, maxLength: number = SYNC.MAX_JD_LENGTH): string {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

/**
 * 공고 상세 페이지 HTML에서 JD 추출 (Service Worker용 - DOMParser 없이)
 */
export function parseJdFromHtml(html: string): string | null {
  try {
    const jdPatterns = [
      /<section[^>]*class="[^"]*JobDescription[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
      /<div[^>]*class="[^"]*JobDescription[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*job-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<section[^>]*class="[^"]*Description[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
    ]

    for (const pattern of jdPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const text = stripHtmlTags(match[1])
        if (text.length > 100) {
          return truncateText(text)
        }
      }
    }

    // 폴백: main 태그 내용 추출
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    if (mainMatch && mainMatch[1]) {
      const text = stripHtmlTags(mainMatch[1])
      if (text.length > 200) {
        return truncateText(text)
      }
    }

    // 폴백2: __NEXT_DATA__ JSON에서 추출
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
    if (nextDataMatch && nextDataMatch[1]) {
      try {
        const nextData = JSON.parse(nextDataMatch[1])
        const pageProps = nextData?.props?.pageProps
        const job = pageProps?.job || pageProps?.jobDetail || pageProps?.data?.job

        if (job) {
          const detail = job.detail || job
          const jdParts = [
            detail.intro || detail.introduction || job.intro,
            detail.main_tasks || detail.mainTasks || detail.main_task || job.main_tasks,
            detail.requirements || detail.requirement || job.requirements,
            detail.preferred_points || detail.preferredPoints || detail.preferred || job.preferred_points,
            detail.benefits || detail.benefit || detail.welfare || job.benefits,
            detail.hire_round || detail.hireRound || job.hire_round,
            detail.skill_tags || job.skill_tags,
          ].filter(Boolean)

          if (jdParts.length > 0) {
            const text = jdParts.join('\n\n')
            return truncateText(text)
          }
        }
      } catch {
        // JSON 파싱 실패 무시
      }
    }

    return null
  } catch (error) {
    console.error('[JD Fetcher] Failed to parse HTML:', error)
    return null
  }
}

/** JD 결과 타입 (마감일 포함) */
export interface JdResult {
  content: string | null
  deadline: string | null
}

/** 사람인 JD 결과 타입 */
export interface SaraminJdResult {
  content: string
  isImage: boolean
  imageUrls: string[]
  deadline: string | null
}

/**
 * 사람인 공고 URL에서 JD + 마감일 가져오기 (백그라운드 탭 + 스크립트 주입)
 */
export async function fetchSaraminJd(sourceUrl: string): Promise<SaraminJdResult | null> {
  let tabId: number | undefined
  let windowId: number | undefined

  try {
    const window = await chrome.windows.create({
      url: sourceUrl,
      state: 'minimized',
      focused: false,
    })
    windowId = window.id
    tabId = window.tabs?.[0]?.id

    if (!tabId) {
      return null
    }

    // 페이지 로드 대기
    await new Promise<void>((resolve) => {
      const listener = (updatedTabId: number, info: chrome.tabs.TabChangeInfo) => {
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      }
      chrome.tabs.onUpdated.addListener(listener)
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }, TIMEOUTS.SARAMIN_PAGE_LOAD)
    })

    // iframe 로드 대기
    await new Promise(resolve => setTimeout(resolve, TIMEOUTS.IFRAME_LOAD))

    // 스크립트 주입하여 JD + 마감일 추출
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // 마감일 추출 (메인 페이지에서)
        let deadline: string | null = null
        const pageText = document.body.innerText || ''

        // 사람인 마감일 패턴
        const deadlinePatterns = [
          /마감일[:\s]*(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/,
          /접수마감[:\s]*(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/,
          /~\s*(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/,
          /(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})\s*(?:까지|마감)/,
          /(\d{2}[.\-\/]\d{1,2}[.\-\/]\d{1,2})\s*(?:\(.\)|까지|마감)/,
        ]

        for (const pattern of deadlinePatterns) {
          const match = pageText.match(pattern)
          if (match && match[1]) {
            let dateStr = match[1].replace(/[.\/]/g, '-')
            // 2자리 연도를 4자리로 변환
            if (dateStr.match(/^\d{2}-/)) {
              dateStr = '20' + dateStr
            }
            deadline = dateStr
            break
          }
        }

        // JD 추출 (iframe에서)
        const iframe = document.querySelector('iframe.iframe_content, iframe[id^="iframe_content"]') as HTMLIFrameElement
        if (!iframe) {
          return { content: '', isImage: false, imageUrls: [], deadline }
        }

        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
          if (!iframeDoc?.body) {
            return { content: '', isImage: false, imageUrls: [], deadline }
          }

          const images = iframeDoc.body.querySelectorAll('img')
          const textContent = iframeDoc.body.innerText?.trim() || ''

          if (images.length > 0 && textContent.length < 300) {
            const imageUrls: string[] = []
            images.forEach((img) => {
              const src = img.src || img.getAttribute('data-src')
              if (src && src.startsWith('http')) {
                imageUrls.push(src)
              }
            })
            return { content: '[이미지 형식 공고]', isImage: true, imageUrls, deadline }
          }

          if (textContent.length > 100) {
            return { content: textContent, isImage: false, imageUrls: [], deadline }
          }

          return { content: '', isImage: false, imageUrls: [], deadline }
        } catch {
          return { content: '', isImage: false, imageUrls: [], deadline }
        }
      },
    })

    if (windowId) {
      await chrome.windows.remove(windowId)
    }

    const result = results[0]?.result as SaraminJdResult | null
    if (result && (result.content || result.deadline)) {
      return result
    }

    return null
  } catch (error) {
    console.error('[JD Fetcher] Failed to fetch Saramin JD:', error)
    if (windowId) {
      try { await chrome.windows.remove(windowId) } catch { /* ignore */ }
    }
    return null
  }
}

/**
 * 잡코리아 공고 URL에서 JD + 마감일 가져오기 (백그라운드 탭 + 스크립트 주입)
 */
export async function fetchJobkoreaJd(sourceUrl: string): Promise<JdResult | null> {
  if (!sourceUrl || !sourceUrl.includes(PLATFORM_URLS.JOBKOREA_JD)) {
    return null
  }

  let tabId: number | undefined
  let windowId: number | undefined

  try {
    const window = await chrome.windows.create({
      url: sourceUrl,
      state: 'minimized',
      focused: false,
    })
    windowId = window.id
    tabId = window.tabs?.[0]?.id

    if (!tabId) {
      return null
    }

    // 페이지 로드 대기
    await new Promise<void>((resolve) => {
      const listener = (updatedTabId: number, info: chrome.tabs.TabChangeInfo) => {
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      }
      chrome.tabs.onUpdated.addListener(listener)
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }, TIMEOUTS.PAGE_LOAD_MAX)
    })

    // DOM 렌더링 대기
    await new Promise(resolve => setTimeout(resolve, TIMEOUTS.REACT_RENDER))

    // 스크립트 주입하여 JD + 마감일 추출
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // JD 추출
        let content: string | null = null

        // 잡코리아 JD 컨테이너 셀렉터들
        const jdSelectors = [
          '.tbRow',
          '.artReadJobSum',
          '.detailContents',
          '.recruitment-detail',
          '.job-detail',
          '[class*="detail"]',
        ]

        for (const selector of jdSelectors) {
          const el = document.querySelector(selector)
          if (el) {
            const text = (el as HTMLElement).innerText?.trim()
            if (text && text.length > 100) {
              content = text
              break
            }
          }
        }

        // fallback: article 또는 main 태그
        if (!content) {
          const article = document.querySelector('article, main, .article')
          if (article) {
            const text = (article as HTMLElement).innerText?.trim()
            if (text && text.length > 100) {
              content = text
            }
          }
        }

        // 마감일 추출
        let deadline: string | null = null
        const pageText = document.body.innerText || ''

        // 잡코리아 마감일 패턴
        const deadlinePatterns = [
          /마감일[:\s]*(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/,
          /접수마감[:\s]*(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/,
          /~\s*(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/,
          /(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})\s*(?:까지|마감)/,
          /(\d{2}[.\-\/]\d{1,2}[.\-\/]\d{1,2})\s*(?:\(.\)|까지|마감)/,
        ]

        for (const pattern of deadlinePatterns) {
          const match = pageText.match(pattern)
          if (match && match[1]) {
            let dateStr = match[1].replace(/[.\/]/g, '-')
            // 2자리 연도를 4자리로 변환
            if (dateStr.match(/^\d{2}-/)) {
              dateStr = '20' + dateStr
            }
            deadline = dateStr
            break
          }
        }

        return { content, deadline }
      },
    })

    if (windowId) {
      await chrome.windows.remove(windowId)
    }

    const result = results[0]?.result as { content: string | null; deadline: string | null } | null
    if (result) {
      return {
        content: result.content ? truncateText(result.content) : null,
        deadline: result.deadline,
      }
    }

    return null
  } catch (error) {
    console.error('[JD Fetcher] Failed to fetch Jobkorea JD:', error)
    if (windowId) {
      try { await chrome.windows.remove(windowId) } catch { /* ignore */ }
    }
    return null
  }
}

/**
 * 원티드 공고 URL에서 JD + 마감일 가져오기 (백그라운드 탭 + 스크립트 주입)
 */
export async function fetchWantedJd(sourceUrl: string): Promise<JdResult | null> {
  if (!sourceUrl || !sourceUrl.includes(PLATFORM_URLS.WANTED_JD)) {
    return null
  }

  let tabId: number | undefined
  let windowId: number | undefined

  try {
    const window = await chrome.windows.create({
      url: sourceUrl,
      state: 'minimized',
      focused: false,
    })
    windowId = window.id
    tabId = window.tabs?.[0]?.id

    if (!tabId) {
      return null
    }

    // 페이지 로드 대기
    await new Promise<void>((resolve) => {
      const listener = (updatedTabId: number, info: chrome.tabs.TabChangeInfo) => {
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      }
      chrome.tabs.onUpdated.addListener(listener)
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }, TIMEOUTS.PAGE_LOAD_MAX)
    })

    // React 렌더링 대기
    await new Promise(resolve => setTimeout(resolve, TIMEOUTS.REACT_RENDER))

    // 스크립트 주입하여 JD + 마감일 추출
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // "상세 정보 더 보기" 버튼 클릭
        const buttons = document.querySelectorAll('button')
        for (const btn of buttons) {
          const text = btn.textContent?.trim() || ''
          if (text.includes('상세 정보 더 보기') || text.includes('상세정보 더 보기') || text === '더 보기') {
            btn.click()
            break
          }
        }

        return new Promise<{ content: string | null; deadline: string | null }>((resolve) => {
          setTimeout(() => {
            // JD 추출
            let content: string | null = null
            const jdSection = document.querySelector('[class*="JobDescription_JobDescription"]') ||
                              document.querySelector('[class*="JobDescription__"]') ||
                              document.querySelector('.JobDescription')

            if (jdSection) {
              const text = (jdSection as HTMLElement).innerText?.trim()
              content = text && text.length > 100 ? text : null
            } else {
              const detail = document.querySelector('[class*="JobDetail_jobDetail"]')
              if (detail) {
                const text = (detail as HTMLElement).innerText?.trim()
                content = text && text.length > 100 ? text : null
              }
            }

            // 마감일 추출 - 원티드는 "마감일" 또는 날짜 형식으로 표시
            let deadline: string | null = null

            // 방법 1: 마감일 라벨 근처 텍스트 찾기
            const allText = document.body.innerText
            const deadlinePatterns = [
              /마감일[:\s]*(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/,
              /마감[:\s]*(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/,
              /(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})\s*마감/,
              /접수\s*기간[^~]*~\s*(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/,
            ]

            for (const pattern of deadlinePatterns) {
              const match = allText.match(pattern)
              if (match && match[1]) {
                deadline = match[1].replace(/[.\/]/g, '-')
                break
              }
            }

            // 방법 2: 상시채용 체크
            if (!deadline && (allText.includes('상시') || allText.includes('채용시'))) {
              deadline = null // 상시채용은 마감일 없음
            }

            resolve({ content, deadline })
          }, 1000)
        })
      },
    })

    if (windowId) {
      await chrome.windows.remove(windowId)
    }

    const result = results[0]?.result as { content: string | null; deadline: string | null } | null
    if (result) {
      return {
        content: result.content ? truncateText(result.content) : null,
        deadline: result.deadline,
      }
    }

    return null
  } catch (error) {
    console.error('[JD Fetcher] Failed to fetch Wanted JD:', error)
    if (windowId) {
      try { await chrome.windows.remove(windowId) } catch { /* ignore */ }
    }
    return null
  }
}
