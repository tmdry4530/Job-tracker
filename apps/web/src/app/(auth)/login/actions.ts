'use server'

import { signIn } from '@/auth'

type OAuthProvider = 'google' | 'kakao'

/**
 * OAuth 소셜 로그인 (Auth.js v5)
 * signIn이 내부적으로 OAuth 제공자로 redirect 한다.
 */
export async function signInWithOAuth(provider: OAuthProvider) {
  await signIn(provider, { redirectTo: '/applications' })
}
