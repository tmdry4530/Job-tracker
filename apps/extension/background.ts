import { createExtensionSupabaseClient, setStoredSession, getStoredSession, isSessionExpired } from '~lib/supabase'
import type { StoredSession, SessionMessage, ParseMessage, ParsedApplication, ExtensionMessage, SyncMessage } from '~lib/types'
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
  if (message.type === 'SESSION_UPDATE') {
    handleSessionUpdate((message as SessionMessage).session)
    sendResponse({ success: true })
  } else if (message.type === 'PARSE_COMPLETED' || message.type === 'PARSE_FAILED') {
    handleParseResult(message as ParseMessage)
    sendResponse({ success: true })
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
        // Upsert: source_url 기준으로 중복 확인
        const { error } = await supabase
          .from('applications')
          .upsert({
            user_id: user.id,
            platform: app.platform,
            company_name: app.companyName,
            position: app.position,
            source_url: app.sourceUrl,
            jd_content: app.jdContent || null,
            status: app.status,
            applied_at: app.appliedAt,
          }, {
            onConflict: 'user_id,source_url',
            ignoreDuplicates: false,
          })

        if (error) {
          console.error('[Extension BG] Upsert error:', error)
          skippedCount++
        } else {
          syncedCount++
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
