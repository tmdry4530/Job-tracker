'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * 로그아웃 Server Action
 * - Supabase 세션 종료
 * - 세션 쿠키 삭제 (@supabase/ssr가 자동 처리)
 * - /login 페이지로 리다이렉트
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    // 에러가 발생해도 로그인 페이지로 리다이렉트
    // (세션이 이미 만료된 경우 등)
    // TODO: 프로덕션에서는 로깅 서비스(Sentry 등)로 대체
    console.error('[Logout] signOut failed:', error.message);
  }

  // NOTE: redirect()는 내부적으로 예외를 던져서 이 함수를 종료합니다.
  redirect('/login');
}
