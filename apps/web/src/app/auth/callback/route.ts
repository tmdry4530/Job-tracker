import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * OAuth 콜백 처리
 * Google/Kakao 로그인 후 리다이렉트되는 엔드포인트
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/applications'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // OAuth 에러 처리
  if (error) {
    console.error('[Auth Callback] OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (!code) {
    console.error('[Auth Callback] No code provided')
    return NextResponse.redirect(`${origin}/login?error=인증 코드가 없습니다`)
  }

  try {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[Auth Callback] Exchange error:', exchangeError)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    // 로그인 성공 - 대시보드로 리다이렉트
    return NextResponse.redirect(`${origin}${next}`)
  } catch (err) {
    console.error('[Auth Callback] Unexpected error:', err)
    return NextResponse.redirect(`${origin}/login?error=로그인 처리 중 오류가 발생했습니다`)
  }
}
