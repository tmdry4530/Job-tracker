import { getStoredAuth, setStoredAuth, apiFetch } from '~lib/api-client'
import type {
  StoredAuth,
  AuthMessage,
  ParseMessage,
  ParsedApplication,
  ExtensionMessage,
  JdCollectMessage,
  SyncResult,
} from '~lib/types'
import { syncBookmarks } from '~lib/sync-service'
import { callOcrApi } from '~lib/ocr-api'
import { BADGE_COLORS } from '~lib/constants'

export {}

/**
 * Background Service Worker
 * - Content Script에서 인증(Bearer 토큰) 업데이트 수신
 * - chrome.storage.local에 인증 저장
 * - 웹 API 호출로 북마크/JD 동기화
 * - 파싱 결과 수신 및 저장
 */

let auth: StoredAuth | null = null
let pendingApplications: ParsedApplication[] = []

/**
 * Content Script 및 Popup에서 메시지 수신
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  console.log('[Extension BG] Message received:', message.type)

  switch (message.type) {
    case 'AUTH_UPDATE':
      handleAuthUpdate((message as AuthMessage).auth)
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
 * 인증 업데이트 처리
 */
async function handleAuthUpdate(newAuth: StoredAuth | null) {
  try {
    await setStoredAuth(newAuth)
    auth = newAuth
    console.log('[Extension BG] Auth updated:', newAuth ? 'logged in' : 'logged out')
  } catch (error) {
    console.error('[Extension BG] Failed to update auth:', error)
  }
}

/**
 * chrome.storage 변경 감지
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.auth) {
    auth = (changes.auth.newValue as StoredAuth | undefined) || null
  }
})

/**
 * 확장 프로그램 설치 시 초기화
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('Job Application Tracker Extension installed')
  initializeAuth()
})

/**
 * Service Worker 시작 시 초기 인증 로드
 */
async function initializeAuth() {
  auth = await getStoredAuth()
}

// Service Worker 시작 시 인증 초기화
initializeAuth()

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

  if (!auth) {
    return { error: '로그인이 필요합니다', timestamp: Date.now() }
  }

  if (pendingApplications.length === 0) {
    return { syncedCount: 0, skippedCount: 0, timestamp: Date.now() }
  }

  try {
    const result = await syncBookmarks(auth, pendingApplications)

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

  if (!auth) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  try {
    // 이미지 기반 JD인 경우 OCR 시도
    let jdContent = payload.jdContent
    if (payload.isImageBased && payload.imageUrls && payload.imageUrls.length > 0) {
      console.log(`[Extension BG] Attempting OCR for ${payload.imageUrls.length} images`)
      const ocrText = await callOcrApi(payload.imageUrls, auth.token)
      if (ocrText) {
        jdContent = ocrText
      }
    }

    const response = await apiFetch(
      '/api/applications/jd',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: payload.platform,
          companyName: payload.companyName,
          position: payload.position,
          sourceUrl: payload.sourceUrl,
          jdContent,
        }),
      },
      auth.token
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[Extension BG] JD update error:', response.status, errorBody)
      return { success: false, error: 'JD 업데이트 실패' }
    }

    const data = (await response.json()) as { success: boolean; error?: string }
    if (data.success) {
      console.log(`[Extension BG] JD updated for ${payload.companyName} - ${payload.position}`)
    } else {
      console.log(`[Extension BG] JD update skipped: ${data.error}`)
    }
    return data
  } catch (error) {
    console.error('[Extension BG] JD collection error:', error)
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}
