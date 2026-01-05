import { createExtensionSupabaseClient, setStoredSession, getStoredSession, isSessionExpired } from '~lib/supabase'
import type { StoredSession, SessionMessage, ParseMessage, ParsedApplication, ExtensionMessage, SyncMessage, JdCollectMessage } from '~lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export {}

/**
 * Background Service Worker
 * - Content Script에서 세션 업데이트 수신
 * - chrome.storage.local에 세션 저장
 * - Supabase 클라이언트 관리
 * - 파싱 결과 수신 및 저장
 */

let supabase: SupabaseClient | null = null

// 파싱된 지원 내역 임시 저장 (동기화 전)
let pendingApplications: ParsedApplication[] = []

/**
 * 세션으로 Supabase 클라이언트 초기화
 */
function initSupabaseWithSession(session: StoredSession | null) {
  if (session && !isSessionExpired(session)) {
    supabase = createExtensionSupabaseClient(session)
    console.log('[Extension BG] Supabase client initialized with session')
  } else {
    supabase = null
    console.log('[Extension BG] Supabase client cleared')
  }
}

/**
 * Content Script 및 Popup에서 메시지 수신
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  console.log('[Extension BG] Message received:', message.type)

  if (message.type === 'SESSION_UPDATE') {
    handleSessionUpdate((message as SessionMessage).session)
    sendResponse({ success: true })
  } else if (message.type === 'PARSE_COMPLETED' || message.type === 'PARSE_FAILED') {
    handleParseResult(message as ParseMessage)
    sendResponse({ success: true })
  } else if (message.type === 'JD_COLLECTED') {
    handleJdCollected(message as JdCollectMessage).then(sendResponse)
    return true // 비동기 응답
  } else if (message.type === 'SYNC_REQUEST') {
    handleSyncRequest().then(sendResponse)
    return true // 비동기 응답
  } else if (message.type === 'GET_PENDING_APPLICATIONS') {
    sendResponse({ applications: pendingApplications })
  } else if (message.type === 'CLEAR_PENDING') {
    clearPendingApplications().then(() => sendResponse({ success: true }))
    return true
  }
  return true // 비동기 응답을 위해 true 반환
})

/**
 * 세션 업데이트 처리
 */
async function handleSessionUpdate(session: StoredSession | null) {
  try {
    await setStoredSession(session)
    initSupabaseWithSession(session)
    console.log('[Extension BG] Session updated:', session ? 'logged in' : 'logged out')
  } catch (error) {
    console.error('[Extension BG] Failed to update session:', error)
  }
}

/**
 * chrome.storage 변경 감지
 * - 다른 곳에서 세션이 변경된 경우 Supabase 클라이언트 업데이트
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.session) {
    const newSession = changes.session.newValue as StoredSession | undefined
    initSupabaseWithSession(newSession || null)
  }
})

/**
 * 확장 프로그램 설치 시 초기화
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('Job Application Tracker Extension installed')
  initializeSession()
})

/**
 * Service Worker 시작 시 초기 세션 로드
 */
async function initializeSession() {
  const session = await getStoredSession()
  if (session) {
    if (isSessionExpired(session)) {
      console.log('[Extension BG] Stored session expired, clearing...')
      await setStoredSession(null)
    } else {
      initSupabaseWithSession(session)
    }
  }
}

// Service Worker 시작 시 세션 초기화
initializeSession()

/**
 * Supabase 클라이언트 내보내기 (다른 모듈에서 사용)
 */
export function getSupabaseClient(): SupabaseClient | null {
  return supabase
}

/**
 * 파싱 결과 처리
 */
async function handleParseResult(message: ParseMessage) {
  const { type, payload } = message

  if (type === 'PARSE_FAILED') {
    console.error(`[Extension BG] Parse failed for ${payload.platform}:`, payload.error)
    // 뱃지 업데이트 (에러 표시)
    chrome.action.setBadgeText({ text: '!' })
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' })
    return
  }

  if (type === 'PARSE_COMPLETED' && payload.applications) {
    console.log(`[Extension BG] Parsed ${payload.applications.length} applications from ${payload.platform}`)

    // 임시 저장소에 추가
    pendingApplications = [...pendingApplications, ...payload.applications]

    // chrome.storage.local에 저장 (Popup에서 접근 가능)
    await chrome.storage.local.set({
      pendingApplications,
      lastParsed: {
        [payload.platform]: payload.timestamp,
      },
    })

    // 뱃지 업데이트 (새 항목 개수)
    if (pendingApplications.length > 0) {
      chrome.action.setBadgeText({ text: String(pendingApplications.length) })
      chrome.action.setBadgeBackgroundColor({ color: '#10B981' })
    }

    console.log('[Extension BG] Pending applications saved:', pendingApplications.length)
  }
}

/**
 * 대기 중인 지원 내역 조회
 */
export function getPendingApplications(): ParsedApplication[] {
  return pendingApplications
}

/**
 * 대기 중인 지원 내역 클리어 (동기화 완료 후)
 */
export async function clearPendingApplications(): Promise<void> {
  pendingApplications = []
  await chrome.storage.local.set({ pendingApplications: [] })
  chrome.action.setBadgeText({ text: '' })
  console.log('[Extension BG] Pending applications cleared')
}

/**
 * 동기화 요청 처리
 */
async function handleSyncRequest(): Promise<SyncMessage['payload']> {
  console.log('[Extension BG] Sync request received')

  if (!supabase) {
    console.error('[Extension BG] Supabase client not initialized')
    return {
      error: '로그인이 필요합니다',
      timestamp: Date.now(),
    }
  }

  if (pendingApplications.length === 0) {
    console.log('[Extension BG] No pending applications to sync')
    return {
      syncedCount: 0,
      skippedCount: 0,
      timestamp: Date.now(),
    }
  }

  try {
    const result = await syncApplicationsToSupabase(pendingApplications)

    // 동기화 성공 시 pending 클리어
    if (result.syncedCount > 0) {
      await clearPendingApplications()
    }

    return result
  } catch (error) {
    console.error('[Extension BG] Sync failed:', error)
    return {
      error: error instanceof Error ? error.message : '동기화 실패',
      timestamp: Date.now(),
    }
  }
}

/**
 * HTML에서 태그 제거하고 텍스트만 추출
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // script 제거
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // style 제거
    .replace(/<[^>]+>/g, ' ') // 태그 제거
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // 연속 공백 정리
    .trim()
}

/**
 * 공고 상세 페이지 HTML에서 JD 추출 (Service Worker용 - DOMParser 없이)
 */
function parseJdFromHtml(html: string): string | null {
  try {
    // 원티드 JD 영역 패턴 (class에 JobDescription, job-description 등 포함)
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
          console.log(`[Extension BG] JD found with pattern`)
          return text.length > 10000 ? text.substring(0, 10000) + '...' : text
        }
      }
    }

    // 폴백: main 태그 내용 추출
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    if (mainMatch && mainMatch[1]) {
      const text = stripHtmlTags(mainMatch[1])
      if (text.length > 200) {
        console.log(`[Extension BG] JD found in main tag`)
        return text.length > 10000 ? text.substring(0, 10000) + '...' : text
      }
    }

    // 폴백2: __NEXT_DATA__ JSON에서 추출 (Next.js SSR 데이터)
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
    if (nextDataMatch && nextDataMatch[1]) {
      try {
        const nextData = JSON.parse(nextDataMatch[1])
        console.log(`[Extension BG] __NEXT_DATA__ parsed, checking pageProps...`)

        // 다양한 경로 확인
        const pageProps = nextData?.props?.pageProps
        console.log(`[Extension BG] pageProps keys: ${pageProps ? Object.keys(pageProps).join(', ') : 'none'}`)

        const job = pageProps?.job || pageProps?.jobDetail || pageProps?.data?.job
        if (job) {
          console.log(`[Extension BG] Job object found, keys: ${Object.keys(job).join(', ')}`)

          // detail 객체 또는 직접 필드 확인
          const detail = job.detail || job
          console.log(`[Extension BG] Detail keys: ${Object.keys(detail).join(', ')}`)

          // 다양한 필드명 시도
          const jdParts = [
            detail.intro || detail.introduction || job.intro,
            detail.main_tasks || detail.mainTasks || detail.main_task || job.main_tasks,
            detail.requirements || detail.requirement || job.requirements,
            detail.preferred_points || detail.preferredPoints || detail.preferred || job.preferred_points,
            detail.benefits || detail.benefit || detail.welfare || job.benefits,
            detail.hire_round || detail.hireRound || job.hire_round,
            detail.skill_tags || job.skill_tags,
          ].filter(Boolean)

          console.log(`[Extension BG] JD parts found: ${jdParts.length}`)
          jdParts.forEach((part, i) => {
            console.log(`[Extension BG] Part ${i}: ${String(part).substring(0, 50)}...`)
          })

          if (jdParts.length > 0) {
            const text = jdParts.join('\n\n')
            console.log(`[Extension BG] JD found in __NEXT_DATA__ (${text.length} chars)`)
            return text.length > 10000 ? text.substring(0, 10000) + '...' : text
          }
        } else {
          // pageProps 전체 구조 로깅
          console.log(`[Extension BG] No job object. Dumping pageProps structure:`)
          console.log(`[Extension BG] ${JSON.stringify(pageProps, null, 2).substring(0, 1000)}`)
        }
      } catch (e) {
        console.error(`[Extension BG] __NEXT_DATA__ parse error:`, e)
      }
    }

    return null
  } catch (error) {
    console.error('[Extension BG] Failed to parse HTML:', error)
    return null
  }
}

/**
 * 사람인 공고 URL에서 JD 가져오기 (백그라운드 탭 + 스크립트 주입)
 */
async function fetchSaraminJd(sourceUrl: string): Promise<{ content: string; isImage: boolean; imageUrls: string[] } | null> {
  let tabId: number | undefined
  let windowId: number | undefined

  try {
    console.log(`[Extension BG] Opening Saramin tab for JD: ${sourceUrl}`)

    // 최소화된 새 창에서 열기 (사용자에게 안보임)
    const window = await chrome.windows.create({
      url: sourceUrl,
      state: 'minimized',
      focused: false,
    })
    windowId = window.id
    tabId = window.tabs?.[0]?.id

    if (!tabId) {
      console.log('[Extension BG] Failed to create Saramin tab')
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
      }, 15000)
    })

    // iframe 로드 대기
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 스크립트 주입하여 JD 추출
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // iframe 찾기
        const iframe = document.querySelector('iframe.iframe_content, iframe[id^="iframe_content"]') as HTMLIFrameElement
        if (!iframe) {
          return { content: '', isImage: false, imageUrls: [] }
        }

        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
          if (!iframeDoc?.body) {
            return { content: '', isImage: false, imageUrls: [] }
          }

          const images = iframeDoc.body.querySelectorAll('img')
          const textContent = iframeDoc.body.innerText?.trim() || ''

          // 이미지 기반 판단
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

          if (textContent.length > 100) {
            return { content: textContent, isImage: false, imageUrls: [] }
          }

          return { content: '', isImage: false, imageUrls: [] }
        } catch (e) {
          return { content: '', isImage: false, imageUrls: [] }
        }
      },
    })

    // 창 닫기
    if (windowId) {
      await chrome.windows.remove(windowId)
    }

    const result = results[0]?.result as { content: string; isImage: boolean; imageUrls: string[] } | null
    if (result && result.content) {
      console.log(`[Extension BG] Saramin JD extracted: ${result.content.length} chars, isImage: ${result.isImage}`)
      return result
    }

    return null
  } catch (error) {
    console.error('[Extension BG] Failed to fetch Saramin JD:', error)
    if (windowId) {
      try { await chrome.windows.remove(windowId) } catch { /* ignore */ }
    }
    return null
  }
}

/**
 * 원티드 공고 URL에서 JD 가져오기 (백그라운드 탭 + 스크립트 주입)
 */
async function fetchJdFromUrl(sourceUrl: string): Promise<string | null> {
  if (!sourceUrl || !sourceUrl.includes('wanted.co.kr/wd/')) {
    return null
  }

  let tabId: number | undefined
  let windowId: number | undefined

  try {
    console.log(`[Extension BG] Opening tab for JD: ${sourceUrl}`)

    // 최소화된 새 창에서 열기 (사용자에게 안보임)
    const window = await chrome.windows.create({
      url: sourceUrl,
      state: 'minimized',
      focused: false,
    })
    windowId = window.id
    tabId = window.tabs?.[0]?.id

    if (!tabId) {
      console.log('[Extension BG] Failed to create tab')
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

      // 타임아웃 (10초)
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }, 10000)
    })

    // 추가 대기 (React 렌더링)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 스크립트 주입하여 JD 추출
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

        // 클릭 후 대기
        return new Promise<string | null>((resolve) => {
          setTimeout(() => {
            // JD 섹션만 가져오기 (JobDescription 클래스)
            const jdSection = document.querySelector('[class*="JobDescription_JobDescription"]') ||
                              document.querySelector('[class*="JobDescription__"]') ||
                              document.querySelector('.JobDescription')

            if (jdSection) {
              const text = (jdSection as HTMLElement).innerText?.trim()
              resolve(text && text.length > 100 ? text : null)
            } else {
              // 폴백: JobDetail 영역
              const detail = document.querySelector('[class*="JobDetail_jobDetail"]')
              if (detail) {
                const text = (detail as HTMLElement).innerText?.trim()
                resolve(text && text.length > 100 ? text : null)
              } else {
                resolve(null)
              }
            }
          }, 1000)
        })
      },
    })

    // 창 닫기
    if (windowId) {
      await chrome.windows.remove(windowId)
    }

    const jdContent = results[0]?.result as string | null

    if (jdContent) {
      const truncated = jdContent.length > 10000 ? jdContent.substring(0, 10000) + '...' : jdContent
      console.log(`[Extension BG] JD extracted via injection (${truncated.length} chars)`)
      return truncated
    } else {
      console.log('[Extension BG] Could not extract JD from page')
      return null
    }
  } catch (error) {
    console.error('[Extension BG] Failed to fetch JD:', error)

    // 에러 시 창 정리
    if (windowId) {
      try {
        await chrome.windows.remove(windowId)
      } catch {
        // ignore
      }
    }

    return null
  }
}

/**
 * Supabase에 지원 내역 동기화
 */
async function syncApplicationsToSupabase(
  applications: ParsedApplication[]
): Promise<{ syncedCount: number; skippedCount: number; timestamp: number }> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  // 현재 사용자 ID 가져오기
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('사용자 인증 실패')
  }

  let syncedCount = 0
  let skippedCount = 0

  // 중복 URL 제거 (같은 공고가 여러 번 처리되는 것 방지)
  const seen = new Set<string>()
  const uniqueApplications = applications.filter(app => {
    const key = app.sourceUrl || `${app.platform}-${app.companyName}-${app.position}`
    if (seen.has(key)) {
      console.log(`[Extension BG] Skipping duplicate: ${key}`)
      return false
    }
    seen.add(key)
    return true
  })

  console.log(`[Extension BG] Processing ${uniqueApplications.length} unique applications (${applications.length - uniqueApplications.length} duplicates removed)`)

  // Batch 처리 (10개씩)
  const batchSize = 10
  for (let i = 0; i < uniqueApplications.length; i += batchSize) {
    const batch = uniqueApplications.slice(i, i + batchSize)

    for (const app of batch) {
      try {
        // 중복 확인: source_url 기준 (DB 유니크 제약)
        let existing = null
        if (app.sourceUrl) {
          const { data } = await supabase
            .from('applications')
            .select('id, jd_content')
            .eq('user_id', user.id)
            .eq('source_url', app.sourceUrl)
            .maybeSingle()
          existing = data
        }

        // source_url로 못 찾으면 company_name으로 시도 (같은 회사 다른 포지션도 업데이트)
        if (!existing) {
          const { data } = await supabase
            .from('applications')
            .select('id, jd_content, position')
            .eq('user_id', user.id)
            .eq('platform', app.platform)
            .eq('company_name', app.companyName)
            .maybeSingle()
          existing = data
        }

        if (existing) {
          // 이미 존재하면 업데이트 (포지션, 상태, URL 등)
          let jdContent = existing.jd_content

          // JD가 없고 원티드 공고인 경우 JD 가져오기
          if (!jdContent && app.platform === 'wanted' && app.sourceUrl) {
            console.log(`[Extension BG] Fetching JD for existing: ${app.companyName} - ${app.position}`)
            jdContent = await fetchJdFromUrl(app.sourceUrl)
          }

          const { error } = await supabase
            .from('applications')
            .update({
              position: app.position,  // 포지션 업데이트 추가
              source_url: app.sourceUrl,
              status: app.status,
              applied_at: app.appliedAt,
              ...(jdContent && !existing.jd_content ? { jd_content: jdContent } : {}),
            })
            .eq('id', existing.id)

          if (error) {
            console.error('[Extension BG] Update error:', error)
            skippedCount++
          } else {
            syncedCount++
          }
        } else {
          // 새로 삽입
          let jdContent = app.jdContent || null
          const sourceUrl = app.sourceUrl
          let isImageBased = false
          let imageUrls: string[] = []

          // 원티드 공고인 경우 JD 자동 수집
          if (!jdContent && app.platform === 'wanted' && sourceUrl) {
            console.log(`[Extension BG] Fetching JD for new (Wanted): ${app.companyName} - ${app.position}`)
            jdContent = await fetchJdFromUrl(sourceUrl)
          }

          // 사람인 공고인 경우 JD 자동 수집
          if (!jdContent && app.platform === 'saramin' && sourceUrl) {
            console.log(`[Extension BG] Fetching JD for new (Saramin): ${app.companyName} - ${app.position}`)
            const saraminResult = await fetchSaraminJd(sourceUrl)
            if (saraminResult) {
              jdContent = saraminResult.content
              isImageBased = saraminResult.isImage
              imageUrls = saraminResult.imageUrls

              // 이미지 기반이면 OCR 시도
              if (isImageBased && imageUrls.length > 0) {
                const { data: sessionData } = await supabase.auth.getSession()
                const accessToken = sessionData?.session?.access_token
                if (accessToken) {
                  console.log(`[Extension BG] Attempting OCR for ${imageUrls.length} images`)
                  const ocrText = await callOcrApi(imageUrls, accessToken)
                  if (ocrText) {
                    jdContent = ocrText
                    console.log(`[Extension BG] OCR success: ${ocrText.length} chars`)
                  }
                }
              }
            }
          }

          const { error } = await supabase
            .from('applications')
            .insert({
              user_id: user.id,
              platform: app.platform,
              company_name: app.companyName,
              position: app.position,
              source_url: sourceUrl,
              jd_content: jdContent,
              status: app.status,
              applied_at: app.appliedAt,
            })

          if (error) {
            console.error('[Extension BG] Insert error:', error)
            skippedCount++
          } else {
            syncedCount++
          }
        }
      } catch (error) {
        console.error('[Extension BG] Sync item error:', error)
        skippedCount++
      }
    }
  }

  console.log(`[Extension BG] Sync completed: ${syncedCount} synced, ${skippedCount} skipped`)

  return {
    syncedCount,
    skippedCount,
    timestamp: Date.now(),
  }
}

/**
 * OCR API 호출 (이미지 기반 JD용)
 */
async function callOcrApi(imageUrls: string[], accessToken: string): Promise<string | null> {
  try {
    const apiUrl = process.env.PLASMO_PUBLIC_WEB_URL || 'http://localhost:3000'
    const response = await fetch(`${apiUrl}/api/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ imageUrls }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[Extension BG] OCR API error:', response.status, errorBody)
      return null
    }

    const result = await response.json()
    if (result.success && result.data?.text) {
      console.log(`[Extension BG] OCR success: ${result.data.text.length} chars`)
      return result.data.text
    }

    return null
  } catch (error) {
    console.error('[Extension BG] OCR API call failed:', error)
    return null
  }
}

/**
 * JD 수집 처리 - 기존 레코드에 JD 업데이트
 */
async function handleJdCollected(message: JdCollectMessage): Promise<{ success: boolean; error?: string }> {
  const { payload } = message
  console.log(`[Extension BG] JD collected for ${payload.companyName} - ${payload.position}`)

  if (!supabase) {
    console.log('[Extension BG] Supabase not initialized, cannot update JD')
    return { success: false, error: '로그인이 필요합니다' }
  }

  try {
    // 현재 사용자 ID 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: '사용자 인증 실패' }
    }

    // 세션 토큰 가져오기
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token

    // 이미지 기반 JD인 경우 OCR 시도
    let jdContent = payload.jdContent
    if (payload.isImageBased && payload.imageUrls && payload.imageUrls.length > 0 && accessToken) {
      console.log(`[Extension BG] Attempting OCR for ${payload.imageUrls.length} images`)
      const ocrText = await callOcrApi(payload.imageUrls, accessToken)
      if (ocrText) {
        jdContent = ocrText
        console.log(`[Extension BG] OCR extracted ${ocrText.length} chars`)
      } else {
        console.log('[Extension BG] OCR failed, keeping original content')
      }
    }

    // 기존 레코드 찾기 (platform + company_name + position)
    const { data: existing } = await supabase
      .from('applications')
      .select('id, jd_content')
      .eq('user_id', user.id)
      .eq('platform', payload.platform)
      .eq('company_name', payload.companyName)
      .eq('position', payload.position)
      .maybeSingle()

    if (existing) {
      // 기존 레코드 JD 업데이트
      const { error } = await supabase
        .from('applications')
        .update({
          jd_content: jdContent,
          source_url: payload.sourceUrl,
        })
        .eq('id', existing.id)

      if (error) {
        console.error('[Extension BG] JD update error:', error)
        return { success: false, error: error.message }
      }

      console.log(`[Extension BG] JD updated for existing record: ${existing.id}`)
      return { success: true }
    } else {
      // 지원 기록이 없으면 JD 저장 안 함
      console.log(`[Extension BG] No application record found for: ${payload.companyName} - ${payload.position}`)
      return { success: false, error: '지원 기록이 없습니다' }
    }
  } catch (error) {
    console.error('[Extension BG] JD collection error:', error)
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}
