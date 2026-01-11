import { createExtensionSupabaseClient, setStoredSession, getStoredSession, isSessionExpired } from '~lib/supabase'
import type {
  StoredSession,
  SessionMessage,
  ParseMessage,
  ParsedApplication,
  ExtensionMessage,
  JdCollectMessage,
  SyncResult,
} from '~lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { syncApplicationsToSupabase } from '~lib/sync-service'
import { callOcrApi } from '~lib/ocr-api'
import { BADGE_COLORS } from '~lib/constants'

export {}

/**
 * Background Service Worker
 * - Content Script에서 세션 업데이트 수신
 * - chrome.storage.local에 세션 저장
 * - Supabase 클라이언트 관리
 * - 파싱 결과 수신 및 저장
 */

let supabase: SupabaseClient | null = null
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

  switch (message.type) {
    case 'SESSION_UPDATE':
      handleSessionUpdate((message as SessionMessage).session)
      sendResponse({ success: true })
      break

    case 'PARSE_COMPLETED':
    case 'PARSE_FAILED':
      handleParseResult(message as ParseMessage)
      sendResponse({ success: true })
      break

    case 'JD_COLLECTED':
      handleJdCollected(message as JdCollectMessage).then(sendResponse)
      return true

    case 'SYNC_REQUEST':
      handleSyncRequest().then(sendResponse)
      return true

    case 'GET_PENDING_APPLICATIONS':
      sendResponse({ applications: pendingApplications })
      break

    case 'CLEAR_PENDING':
      clearPendingApplications().then(() => sendResponse({ success: true }))
      return true
  }

  return true
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
 * Supabase 클라이언트 내보내기
 */
export function getSupabaseClient(): SupabaseClient | null {
  return supabase
}

/**
 * 파싱 결과 처리
 */
async function handleParseResult(message: ParseMessage) {
  if (message.type === 'PARSE_FAILED') {
    console.error(`[Extension BG] Parse failed for ${message.payload.platform}:`, message.payload.error)
    chrome.action.setBadgeText({ text: '!' })
    chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.ERROR })
    return
  }

  const { platform, applications } = message.payload
  console.log(`[Extension BG] Parsed ${applications.length} applications from ${platform}`)

  pendingApplications = [...pendingApplications, ...applications]

  await chrome.storage.local.set({
    pendingApplications,
    lastParsed: { [platform]: message.payload.timestamp },
  })

  if (pendingApplications.length > 0) {
    chrome.action.setBadgeText({ text: String(pendingApplications.length) })
    chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.SUCCESS })
  }

  console.log('[Extension BG] Pending applications saved:', pendingApplications.length)
}

/**
 * 대기 중인 지원 내역 조회
 */
export function getPendingApplications(): ParsedApplication[] {
  return pendingApplications
}

/**
 * 대기 중인 지원 내역 클리어
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
async function handleSyncRequest(): Promise<SyncResult> {
  console.log('[Extension BG] Sync request received')

  if (!supabase) {
    return { error: '로그인이 필요합니다', timestamp: Date.now() }
  }

  if (pendingApplications.length === 0) {
    return { syncedCount: 0, skippedCount: 0, timestamp: Date.now() }
  }

  try {
    const result = await syncApplicationsToSupabase(supabase, pendingApplications)

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
 * JD 수집 처리 - 기존 레코드에 JD 업데이트
 */
async function handleJdCollected(message: JdCollectMessage): Promise<{ success: boolean; error?: string }> {
  const { payload } = message
  console.log(`[Extension BG] JD collected for ${payload.companyName} - ${payload.position}`)

  if (!supabase) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: '사용자 인증 실패' }
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token

    // 이미지 기반 JD인 경우 OCR 시도
    let jdContent = payload.jdContent
    if (payload.isImageBased && payload.imageUrls && payload.imageUrls.length > 0 && accessToken) {
      console.log(`[Extension BG] Attempting OCR for ${payload.imageUrls.length} images`)
      const ocrText = await callOcrApi(payload.imageUrls, accessToken)
      if (ocrText) {
        jdContent = ocrText
      }
    }

    // 기존 레코드 찾기
    const { data: existing } = await supabase
      .from('applications')
      .select('id, jd_content')
      .eq('user_id', user.id)
      .eq('platform', payload.platform)
      .eq('company_name', payload.companyName)
      .eq('position', payload.position)
      .maybeSingle()

    if (existing) {
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
      console.log(`[Extension BG] No application record found for: ${payload.companyName} - ${payload.position}`)
      return { success: false, error: '지원 기록이 없습니다' }
    }
  } catch (error) {
    console.error('[Extension BG] JD collection error:', error)
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}
