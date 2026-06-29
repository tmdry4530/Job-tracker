/**
 * 웹 대시보드 API 클라이언트
 * - Bearer 토큰을 chrome.storage.local에 저장/조회
 * - 웹 API 호출 시 Authorization 헤더 주입
 *
 * Supabase 직접 접근을 대체. JWT 검증은 서버에서 수행하므로
 * 클라이언트 측 만료 검사는 하지 않는다.
 */

const DASHBOARD_URL = process.env.PLASMO_PUBLIC_DASHBOARD_URL || 'http://localhost:3000'

/**
 * 익스텐션이 저장하는 인증 정보 타입
 */
export type StoredAuth = {
  token: string
  userId: string
}

/**
 * chrome.storage.local에서 인증 정보 가져오기
 */
export async function getStoredAuth(): Promise<StoredAuth | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['auth'], (result) => {
      resolve((result.auth as StoredAuth | undefined) || null)
    })
  })
}

/**
 * chrome.storage.local에 인증 정보 저장
 */
export async function setStoredAuth(auth: StoredAuth | null): Promise<void> {
  if (auth) {
    await chrome.storage.local.set({ auth })
  } else {
    await chrome.storage.local.remove(['auth'])
  }
}

/**
 * 웹 API 호출 (Authorization: Bearer 헤더 주입)
 */
export async function apiFetch(
  path: string,
  init: RequestInit,
  token: string
): Promise<Response> {
  return fetch(`${DASHBOARD_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}
