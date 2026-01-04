import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@shared/types/database'

/**
 * 미들웨어에서 Supabase 세션을 검증하고 갱신하는 함수
 *
 * - 비인증 사용자가 보호된 경로 접근 시 /login으로 리다이렉트
 * - 인증된 사용자가 인증 페이지 접근 시 /applications로 리다이렉트
 * - 세션 토큰 자동 갱신 처리
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser()는 서버에서 JWT 서명을 검증하므로 getSession()보다 안전
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 보호된 경로 목록
  const protectedRoutes = ['/applications']

  // 인증 페이지 목록 (로그인된 사용자는 대시보드로 리다이렉트)
  const authRoutes = ['/login', '/signup']

  // 보호된 경로인지 확인
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // 인증 페이지인지 확인
  const isAuthRoute = authRoutes.some((route) => pathname === route)

  // 비인증 사용자가 보호된 경로 접근 시 → /login으로 리다이렉트
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 인증된 사용자가 인증 페이지 접근 시 → /applications로 리다이렉트
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/applications'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
