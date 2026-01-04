'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginSchema, type AuthResponse } from '@job-tracker/shared';
import { redirect } from 'next/navigation';

export async function signIn(formData: FormData): Promise<AuthResponse> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  // Zod validation
  const result = LoginSchema.safeParse(rawData);
  if (!result.success) {
    const errors = result.error.errors.map((e) => e.message).join(', ');
    return { error: errors };
  }

  const { email, password } = result.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // 에러 유형별 처리
    if (error.message.includes('Invalid login credentials')) {
      return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.' };
    }
    return { error: error.message };
  }

  // NOTE: redirect()는 내부적으로 예외를 던져서 이 함수를 종료합니다.
  // 따라서 이 줄 이후의 코드는 실행되지 않으며, 반환 타입과 무관하게 동작합니다.
  redirect('/applications');
}
