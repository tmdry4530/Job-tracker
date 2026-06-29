/**
 * Auth.js v5 — 메인 설정 (DrizzleAdapter 포함, Node 런타임)
 *
 * auth.config.ts(edge-safe)에 DB 어댑터를 합친 인스턴스.
 * 서버 컴포넌트/라우트 핸들러/액션에서 `auth()`로 세션 조회.
 */
import NextAuth from 'next-auth'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import authConfig from './auth.config'
import { db } from '@/lib/db'
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
})
