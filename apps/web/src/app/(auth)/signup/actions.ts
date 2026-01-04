'use server';

import { createClient } from '@/lib/supabase/server';
import { SignupSchema, type AuthResponse } from '@job-tracker/shared';

function getBaseUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl;

  // Vercel 환경 감지
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // 기본값
  return 'http://localhost:3000';
}

export async function signUp(formData: FormData): Promise<AuthResponse> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  // Zod validation
  const result = SignupSchema.safeParse(rawData);

  if (!result.success) {
    const errors = result.error.errors.map((e) => e.message).join(', ');
    return { error: errors };
  }

  const { email, password } = result.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getBaseUrl()}/auth/confirm`,
    },
  });

  if (error) {
    // 중복 이메일 처리
    if (error.message.includes('already registered')) {
      return { error: '이미 등록된 이메일입니다.' };
    }
    return { error: error.message };
  }

  return { success: true, message: '확인 이메일을 발송했습니다. 이메일을 확인해주세요.' };
}
