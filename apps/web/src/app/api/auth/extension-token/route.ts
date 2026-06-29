/**
 * GET /api/auth/extension-token
 *
 * 로그인된 웹 세션(쿠키)에서 익스텐션용 Bearer 토큰을 발급한다.
 * 익스텐션은 대시보드가 열렸을 때 이 엔드포인트를 호출해 토큰을 받아 chrome.storage에 저장.
 */
import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/get-user'
import { signExtensionToken } from '@/lib/auth/extension-token'

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const token = await signExtensionToken(userId)
  return NextResponse.json({ token, userId })
}
