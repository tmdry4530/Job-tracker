import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { StoredSession } from './types'

/**
 * Extension용 Supabase 클라이언트
 * - 세션 토큰을 외부에서 주입받아 인증 설정
 * - autoRefreshToken: false (Background에서 수동 관리)
 * - persistSession: false (chrome.storage에서 관리)
 */
export function createExtensionSupabaseClient(
  session?: StoredSession
): SupabaseClient {
  const client = createClient(
    process.env.PLASMO_PUBLIC_SUPABASE_URL!,
    process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )

  if (session) {
    // 세션 토큰으로 인증 설정
    client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  }

  return client
}

/**
 * chrome.storage.local에서 세션 가져오기
 */
export async function getStoredSession(): Promise<StoredSession | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['session'], (result) => {
      resolve(result.session || null)
    })
  })
}

/**
 * chrome.storage.local에 세션 저장
 */
export async function setStoredSession(
  session: StoredSession | null
): Promise<void> {
  if (session) {
    await chrome.storage.local.set({ session })
  } else {
    await chrome.storage.local.remove(['session'])
  }
}

/**
 * 세션 만료 여부 확인
 */
export function isSessionExpired(session: StoredSession): boolean {
  // expires_at은 초 단위 Unix timestamp
  const now = Math.floor(Date.now() / 1000)
  return now >= session.expires_at
}
