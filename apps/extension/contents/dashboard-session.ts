import type { PlasmoCSConfig } from 'plasmo'
import type { StoredSession, SessionMessage } from '~lib/types'

/**
 * Dashboard 페이지 Content Script
 * - localStorage에서 세션 변경 감지
 * - Background Script로 세션 정보 전달
 */

export const config: PlasmoCSConfig = {
  matches: ['http://localhost:3000/*'],
  run_at: 'document_idle',
}

const SESSION_STORAGE_KEY = 'job-tracker-extension-session'

/**
 * localStorage에서 세션 읽기
 */
function getSessionFromStorage(): StoredSession | null {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as StoredSession
  } catch {
    return null
  }
}

/**
 * Background Script로 세션 업데이트 전달
 */
async function sendSessionToBackground(session: StoredSession | null) {
  const message: SessionMessage = {
    type: 'SESSION_UPDATE',
    session,
  }

  try {
    await chrome.runtime.sendMessage(message)
    console.log('[Extension CS] Session synced to background:', session ? 'logged in' : 'logged out')
  } catch (error) {
    console.error('[Extension CS] Failed to send session to background:', error)
  }
}

/**
 * 초기 세션 로드 및 동기화
 */
function initSession() {
  const session = getSessionFromStorage()
  sendSessionToBackground(session)
}

/**
 * storage 이벤트 리스너 (다른 탭에서 변경 감지)
 */
function handleStorageChange(event: StorageEvent) {
  if (event.key !== SESSION_STORAGE_KEY) return

  const session = event.newValue ? (JSON.parse(event.newValue) as StoredSession) : null
  sendSessionToBackground(session)
}

/**
 * 커스텀 이벤트 리스너 (같은 탭에서 변경 감지)
 * Dashboard 앱에서 dispatchEvent로 세션 변경 알림
 */
function handleSessionEvent(event: CustomEvent<StoredSession | null>) {
  sendSessionToBackground(event.detail)
}

// 초기화
initSession()

// 다른 탭에서의 storage 변경 감지
window.addEventListener('storage', handleStorageChange)

// 같은 탭에서의 세션 변경 감지 (커스텀 이벤트)
window.addEventListener('job-tracker-session-change', handleSessionEvent as EventListener)

console.log('[Extension CS] Dashboard session content script loaded')
