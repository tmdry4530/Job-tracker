'use server';

import { signOut as authSignOut } from '@/auth';

/**
 * 로그아웃 Server Action (Auth.js v5)
 * - 세션 쿠키 삭제 후 /login 으로 리다이렉트
 */
export async function signOut(): Promise<void> {
  await authSignOut({ redirectTo: '/login' });
}
