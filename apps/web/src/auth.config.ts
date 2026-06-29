/**
 * Auth.js v5 — Edge-safe 설정 (미들웨어용)
 *
 * DrizzleAdapter(pg)는 edge 런타임에서 동작하지 않으므로 여기엔 넣지 않는다.
 * providers/callbacks/pages만 정의하고, DB 어댑터는 auth.ts에서 합친다.
 */
import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Kakao from 'next-auth/providers/kakao'

export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID,
      clientSecret: process.env.AUTH_KAKAO_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    // 사용자 DB id를 JWT/세션에 실어 서버 어디서나 user.id 사용 가능하게 함
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  // 세션은 JWT 전략 (익스텐션 토큰 발급/edge 미들웨어 호환)
  session: { strategy: 'jwt' },
} satisfies NextAuthConfig
