import { redirect } from 'next/navigation'

/**
 * 루트 페이지 — 대시보드로 리다이렉트.
 * 인증 여부는 미들웨어가 처리 (비인증 시 /login).
 * OAuth 콜백은 Auth.js가 /api/auth/callback/[provider]에서 처리.
 */
export default function HomePage() {
  redirect('/applications')
}
