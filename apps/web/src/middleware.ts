/**
 * 미들웨어 — Auth.js(edge) 기반 라우트 보호
 *
 * - 비인증 사용자가 보호 경로(/applications) 접근 시 → /login
 * - 인증 사용자가 인증 페이지(/login) 접근 시 → /applications
 *
 * DrizzleAdapter(pg)는 edge에서 못 쓰므로 auth.config(어댑터 없음)로 인스턴스 생성.
 * JWT 세션이라 DB 없이 쿠키만으로 인증 여부 판별 가능.
 */
import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import authConfig from '@/auth.config'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  const isProtectedRoute =
    pathname === '/applications' || pathname.startsWith('/applications/')
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  if (!isLoggedIn && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/applications', req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // _next 정적/이미지, favicon, 정적 이미지, /api/auth 콜백 제외
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
