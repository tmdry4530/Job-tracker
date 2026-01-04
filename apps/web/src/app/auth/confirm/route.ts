import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VALID_OTP_TYPES = ['email', 'signup', 'recovery', 'invite', 'magiclink'] as const;
type OtpType = typeof VALID_OTP_TYPES[number];

function isValidOtpType(type: string | null): type is OtpType {
  return type !== null && VALID_OTP_TYPES.includes(type as OtpType);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  if (token_hash && isValidOtpType(type)) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // 인증 성공: 리다이렉트
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // 에러 발생 시 에러 페이지로 리다이렉트
  return NextResponse.redirect(
    new URL('/auth/error?message=이메일 확인에 실패했습니다', request.url)
  );
}
