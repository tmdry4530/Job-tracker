/**
 * 현재 사용자 식별 헬퍼
 *
 * RLS를 앱 레벨로 대체. 모든 쿼리/라우트는 여기서 userId를 얻어 `WHERE user_id = ...`로 격리한다.
 *
 * - 서버 컴포넌트/액션: `getCurrentUserId()` (쿠키 세션)
 * - API 라우트(웹 + 익스텐션): `getUserIdFromRequest(req)` (Bearer 토큰 우선, 없으면 쿠키 세션)
 */
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { verifyExtensionToken } from './extension-token'

/** 쿠키 세션 기반 사용자 id (없으면 null) */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/** 로그인 필수 — 없으면 throw (서버 컴포넌트/액션용) */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('UNAUTHORIZED')
  }
  return userId
}

/**
 * API 라우트용: Authorization: Bearer 토큰(익스텐션) 우선, 없으면 쿠키 세션(웹).
 * 인증 실패 시 null.
 */
export async function getUserIdFromRequest(
  req: NextRequest
): Promise<string | null> {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim()
    const userId = await verifyExtensionToken(token)
    if (userId) return userId
  }

  const session = await auth()
  return session?.user?.id ?? null
}
