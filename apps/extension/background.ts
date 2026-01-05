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
 * 원티드 API로 검색 → 상세 API로 JD 추출
 */
async function fetchWantedJd(companyName: string, position: string): Promise<{ jdContent: string; sourceUrl: string } | null> {
  try {
    // 회사명 정리 (괄호, 특수문자 제거)
    const cleanCompanyName = companyName.replace(/[()[\]]/g, ' ').replace(/\s+/g, ' ').trim().split(' ')[0]

    // 1. 검색 API (v4)
    const searchQuery = encodeURIComponent(cleanCompanyName)
    const searchApiUrl = `https://www.wanted.co.kr/api/v4/jobs?country=kr&job_sort=job.latest_order&years=-1&locations=all&limit=20&query=${searchQuery}`

    console.log(`[Extension BG] Calling search API: ${searchApiUrl}`)
    const searchResponse = await fetch(searchApiUrl, {
      headers: {
        'Accept': 'application/json',
        'wanted-user-country': 'KR',
        'wanted-user-language': 'ko',
      },
    })

    if (!searchResponse.ok) {
      console.log(`[Extension BG] Search API failed: ${searchResponse.status}`)
      return null
    }

    const searchData = await searchResponse.json()
    const jobs = searchData.data || []

    console.log(`[Extension BG] Found ${jobs.length} jobs`)

    if (jobs.length === 0) {
      console.log('[Extension BG] No jobs found')
      return null
    }

    // 회사명과 포지션이 일치하는 공고 찾기
    const companyLower = companyName.toLowerCase()
    const positionLower = position.toLowerCase()

    let matchedJob = jobs.find((job: { company: { name: string }; position: string }) => {
      const jobCompany = (job.company?.name || '').toLowerCase()
      const jobPosition = (job.position || '').toLowerCase()
      // 회사명 일치 + 포지션 일부 일치
      return jobCompany.includes(cleanCompanyName.toLowerCase()) &&
             (positionLower.includes(jobPosition.substring(0, 10)) ||
              jobPosition.includes(positionLower.substring(0, 10)))
    })

    // 회사명만 일치해도 OK
    if (!matchedJob) {
      matchedJob = jobs.find((job: { company: { name: string } }) => {
        const jobCompany = (job.company?.name || '').toLowerCase()
        return jobCompany.includes(cleanCompanyName.toLowerCase()) ||
               companyLower.includes(jobCompany)
      })
    }

    if (!matchedJob) {
      console.log('[Extension BG] No matching job found')
      return null
    }

    const jobId = matchedJob.id
    const jobUrl = `https://www.wanted.co.kr/wd/${jobId}`
    console.log(`[Extension BG] Matched job: ${matchedJob.company?.name} - ${matchedJob.position}`)

    // 2. 공고 상세 API 호출
    const detailApiUrl = `https://www.wanted.co.kr/api/v4/jobs/${jobId}`
    const detailResponse = await fetch(detailApiUrl, {
      headers: {
        'Accept': 'application/json',
        'wanted-user-country': 'KR',
        'wanted-user-language': 'ko',
      },
    })

    if (!detailResponse.ok) {
      console.log(`[Extension BG] Detail API failed: ${detailResponse.status}`)
      return null
    }

    const detailData = await detailResponse.json()
    const job = detailData.job || detailData

    // JD 내용 조합
    const jdParts = [
      job.detail?.intro,
      job.detail?.main_tasks,
      job.detail?.requirements,
      job.detail?.preferred_points,
      job.detail?.benefits,
    ].filter(Boolean)

    let jdContent = jdParts.join('\n\n')

    if (!jdContent || jdContent.length < 50) {
      console.log('[Extension BG] JD content too short')
      return null
    }

    if (jdContent.length > 10000) {
      jdContent = jdContent.substring(0, 10000) + '...'
    }

    console.log(`[Extension BG] JD fetched successfully (${jdContent.length} chars)`)
    return { jdContent, sourceUrl: jobUrl }
  } catch (error) {
    console.error('[Extension BG] Failed to fetch JD:', error)
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

  // Batch 처리 (10개씩)
  const batchSize = 10
  for (let i = 0; i < applications.length; i += batchSize) {
    const batch = applications.slice(i, i + batchSize)

    for (const app of batch) {
      try {
        // 중복 확인: platform + company_name + position 기준
        const { data: existing } = await supabase
          .from('applications')
          .select('id')
          .eq('user_id', user.id)
          .eq('platform', app.platform)
          .eq('company_name', app.companyName)
          .eq('position', app.position)
          .maybeSingle()

        if (existing) {
          // 이미 존재하면 업데이트 (상태, URL 등)
          const { error } = await supabase
            .from('applications')
            .update({
              source_url: app.sourceUrl,
              status: app.status,
              applied_at: app.appliedAt,
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
          let sourceUrl = app.sourceUrl

          // JD 자동 수집은 OpenAPI 키 발급 후 활성화 예정
          // TODO: 원티드 OpenAPI 연동
          // if (!jdContent && app.platform === 'wanted') {
          //   const jdResult = await fetchWantedJd(app.companyName, app.position)
          //   if (jdResult) {
          //     jdContent = jdResult.jdContent
          //     sourceUrl = jdResult.sourceUrl
          //   }
          // }

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
          jd_content: payload.jdContent,
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
