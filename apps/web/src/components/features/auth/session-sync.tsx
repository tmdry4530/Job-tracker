'use client'

import { useEffect } from 'react'

/**
 * 익스텐션 인증 저장 형식
 */
interface StoredAuth {
  token: string
  userId: string
}

const EXTENSION_TOKEN_KEY = 'job-tracker-extension-token'

/**
 * SessionSync 컴포넌트
 * - 마운트 시 /api/auth/extension-token 호출로 익스텐션용 Bearer 토큰 발급
 * - localStorage에 토큰 저장
 * - 커스텀 이벤트 dispatch (Content Script에서 감지)
 */
export function SessionSync() {
  useEffect(() => {
    const syncAuth = (auth: StoredAuth | null) => {
      if (auth) {
        localStorage.setItem(EXTENSION_TOKEN_KEY, JSON.stringify(auth))
      } else {
        localStorage.removeItem(EXTENSION_TOKEN_KEY)
      }

      // Content Script에서 감지할 수 있도록 커스텀 이벤트 발생
      window.dispatchEvent(
        new CustomEvent('job-tracker-session-change', { detail: auth })
      )
    }

    const fetchExtensionToken = async () => {
      try {
        const response = await fetch('/api/auth/extension-token')
        if (response.ok) {
          const auth = (await response.json()) as StoredAuth
          syncAuth({ token: auth.token, userId: auth.userId })
        } else {
          syncAuth(null)
        }
      } catch {
        syncAuth(null)
      }
    }

    fetchExtensionToken()
  }, [])

  // UI 렌더링 없음
  return null
}
