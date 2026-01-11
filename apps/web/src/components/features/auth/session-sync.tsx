'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Extension 세션 저장 형식
 */
interface StoredSession {
  access_token: string
  refresh_token: string
  expires_at: number
  user: {
    id: string
    email: string
  }
}

const SESSION_STORAGE_KEY = 'job-tracker-extension-session'

/**
 * SessionSync 컴포넌트
 * - Supabase onAuthStateChange를 구독하여 세션 변경 감지
 * - localStorage에 세션 정보 저장
 * - 커스텀 이벤트 dispatch (Content Script에서 감지)
 */
export function SessionSync() {
  useEffect(() => {
    const supabase = createClient()

    /**
     * 세션을 localStorage에 저장하고 커스텀 이벤트 발생
     */
    const syncSession = (session: StoredSession | null) => {
      if (session) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY)
      }

      // Content Script에서 감지할 수 있도록 커스텀 이벤트 발생
      window.dispatchEvent(
        new CustomEvent('job-tracker-session-change', { detail: session })
      )
    }

    // onAuthStateChange 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[SessionSync] Auth state changed:', event)

        if (session) {
          const storedSession: StoredSession = {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at ?? 0,
            user: {
              id: session.user.id,
              email: session.user.email ?? '',
            },
          }
          syncSession(storedSession)
        } else {
          syncSession(null)
        }
      }
    )

    // 초기 세션 확인 및 동기화
    const initializeSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const storedSession: StoredSession = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at ?? 0,
          user: {
            id: session.user.id,
            email: session.user.email ?? '',
          },
        }
        syncSession(storedSession)
      } else {
        syncSession(null)
      }
    }

    initializeSession()

    // 클린업
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // UI 렌더링 없음
  return null
}
