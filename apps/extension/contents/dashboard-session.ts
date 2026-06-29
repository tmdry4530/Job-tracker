import type { PlasmoCSConfig } from 'plasmo'
import type { StoredAuth, AuthMessage } from '~lib/types'

/**
 * Dashboard 페이지 Content Script
 * - localStorage에서 인증(Bearer 토큰) 변경 감지
 * - Background Script로 인증 정보 전달
 */

export const config: PlasmoCSConfig = {
  matches: [
    'http://localhost:3000/*',
    'https://*.up.railway.app/*',
  ],
  run_at: 'document_idle',
}

const EXTENSION_TOKEN_KEY = 'job-tracker-extension-token'

/**
 * localStorage에서 인증 정보 읽기
 */
function getAuthFromStorage(): StoredAuth | null {
  try {
    const stored = localStorage.getItem(EXTENSION_TOKEN_KEY)
    if (!stored) return null
    return JSON.parse(stored) as StoredAuth
  } catch {
    return null
  }
}

/**
 * Background Script로 인증 업데이트 전달
 */
async function sendAuthToBackground(authData: StoredAuth | null) {
  const message: AuthMessage = {
    type: 'AUTH_UPDATE',
    auth: authData,
  }

  try {
    await chrome.runtime.sendMessage(message)
    console.log('[Extension CS] Auth synced to background:', authData ? 'logged in' : 'logged out')
  } catch (error) {
    console.error('[Extension CS] Failed to send auth to background:', error)
  }
}

/**
 * 초기 인증 로드 및 동기화
 */
function initAuth() {
  const authData = getAuthFromStorage()
  sendAuthToBackground(authData)
}

/**
 * storage 이벤트 리스너 (다른 탭에서 변경 감지)
 */
function handleStorageChange(event: StorageEvent) {
  if (event.key !== EXTENSION_TOKEN_KEY) return

  const authData = event.newValue ? (JSON.parse(event.newValue) as StoredAuth) : null
  sendAuthToBackground(authData)
}

/**
 * 커스텀 이벤트 리스너 (같은 탭에서 변경 감지)
 * Dashboard 앱에서 dispatchEvent로 인증 변경 알림
 */
function handleAuthEvent(event: CustomEvent<StoredAuth | null>) {
  sendAuthToBackground(event.detail)
}

// 초기화
initAuth()

// 다른 탭에서의 storage 변경 감지
window.addEventListener('storage', handleStorageChange)

// 같은 탭에서의 인증 변경 감지 (커스텀 이벤트)
window.addEventListener('job-tracker-session-change', handleAuthEvent as EventListener)

console.log('[Extension CS] Dashboard session content script loaded')
