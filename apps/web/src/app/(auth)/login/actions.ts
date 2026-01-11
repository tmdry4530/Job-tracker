'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

type OAuthProvider = 'google' | 'kakao'

/**
 * OAuth 소셜 로그인
 */
export async function signInWithOAuth(provider: OAuthProvider) {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin') || headersList.get('x-forwarded-host') || 'http://localhost:3000'

  // HTTPS 프로토콜 확인
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const baseUrl = origin.startsWith('http') ? origin : `${protocol}://${origin}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
      queryParams: provider === 'kakao' ? {
        // 카카오 추가 옵션
      } : undefined,
    },
  })

  if (error) {
    console.error('[OAuth] Error:', error)
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }

  return { error: '로그인 URL을 생성할 수 없습니다.' }
}

/**
 * 로그아웃
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
