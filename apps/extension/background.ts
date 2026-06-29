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

/** 동기화 진행 상태 */
export interface SyncProgress {
  current: number
  total: number
  currentItem?: string
  startedAt: number
}

/** 동기화 타임아웃 (5분) */
const SYNC_TIMEOUT_MS = 5 * 60 * 1000

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
 * 애플리케이션 고유 키 생성
 */
function getApplicationKey(app: ParsedApplication): string {
  return app.sourceUrl || `${app.platform}-${app.companyName}-${app.position}`
}

/**
 * 중복 제거하여 애플리케이션 병합
 */
function mergeApplications(
  existing: ParsedApplication[],
  newApps: ParsedApplication[]
): ParsedApplication[] {
  const existingKeys = new Set(existing.map(getApplicationKey))
  const uniqueNewApps = newApps.filter(app => !existingKeys.has(getApplicationKey(app)))

  console.log(`[Extension BG] Dedup: ${newApps.length} incoming, ${uniqueNewApps.length} new, ${newApps.length - uniqueNewApps.length} duplicates skipped`)

  return [...existing, ...uniqueNewApps]
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

  // 기존 pendingApplications 로드 (Service Worker 재시작 대비)
  const { pendingApplications: storedPending } = await chrome.storage.local.get(['pendingApplications'])
  if (storedPending && Array.isArray(storedPending)) {
    pendingApplications = storedPending
  }

  // 중복 제거하여 병합
  pendingApplications = mergeApplications(pendingApplications, applications)

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
 * 동기화 상태 설정 (진행 상황 포함)
 */
async function setSyncingState(
  isSyncing: boolean,
  progress?: SyncProgress
): Promise<void> {
  if (isSyncing && progress) {
    await chrome.storage.local.set({ isSyncing, syncProgress: progress })
  } else {
    await chrome.storage.local.set({ isSyncing, syncProgress: null })
  }
  console.log('[Extension BG] Syncing state:', isSyncing, progress || '')
}

/**
 * 동기화 진행 상황 업데이트
 */
async function updateSyncProgress(
  current: number,
  total: number,
  currentItem?: string
): Promise<void> {
  const { syncProgress } = await chrome.storage.local.get(['syncProgress'])
  const startedAt = syncProgress?.startedAt || Date.now()

  await chrome.storage.local.set({
    syncProgress: { current, total, currentItem, startedAt }
  })
}

/**
 * 오래된 동기화 상태 정리 (타임아웃)
 */
async function cleanupStaleSyncState(): Promise<boolean> {
  const { isSyncing, syncProgress } = await chrome.storage.local.get(['isSyncing', 'syncProgress'])

  if (isSyncing && syncProgress?.startedAt) {
    const elapsed = Date.now() - syncProgress.startedAt
    if (elapsed > SYNC_TIMEOUT_MS) {
      console.log('[Extension BG] Clearing stale sync state (timeout)')
      await setSyncingState(false)
      return true // 상태가 정리됨
    }
  }

  return false
}

/**
 * 동기화 요청 처리
 */
async function handleSyncRequest(): Promise<SyncResult> {
  console.log('[Extension BG] Sync request received')

  // 오래된 동기화 상태 정리
  await cleanupStaleSyncState()

  // 이미 동기화 중인지 확인
  const { isSyncing } = await chrome.storage.local.get(['isSyncing'])
  if (isSyncing) {
    console.log('[Extension BG] Sync already in progress')
    return { error: '동기화가 이미 진행 중입니다', timestamp: Date.now() }
  }

  if (!auth) {
    return { error: '로그인이 필요합니다', timestamp: Date.now() }
  }

  // 최신 pendingApplications 로드 (Service Worker 재시작 대비)
  const { pendingApplications: storedPending } = await chrome.storage.local.get(['pendingApplications'])
  if (storedPending && Array.isArray(storedPending)) {
    pendingApplications = storedPending
  }

  if (pendingApplications.length === 0) {
    return { syncedCount: 0, skippedCount: 0, timestamp: Date.now() }
  }

  const total = pendingApplications.length

  // 동기화 시작 상태 저장
  await setSyncingState(true, {
    current: 0,
    total,
    startedAt: Date.now(),
  })

  try {
    // 진행 상황 콜백과 함께 동기화 실행
    const result = await syncBookmarks(
      auth,
      pendingApplications,
      async (current, currentItem) => {
        await updateSyncProgress(current, total, currentItem)
      }
    )

    if (result.syncedCount > 0) {
      await clearPendingApplications()
    }

    // 동기화 완료 상태 저장
    await setSyncingState(false)
    return result
  } catch (error) {
    console.error('[Extension BG] Sync failed:', error)
    // 동기화 실패 시에도 상태 초기화
    await setSyncingState(false)
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
