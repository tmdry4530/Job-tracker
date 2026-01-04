/**
 * Auth Schemas
 * 인증 관련 Zod 스키마 정의
 */

import { z } from 'zod';

// ============================================================================
// Signup Schema
// ============================================================================

export const SignupSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
});

export type SignupInput = z.infer<typeof SignupSchema>;

// ============================================================================
// Login Schema
// ============================================================================

export const LoginSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ============================================================================
// Auth Response Schema
// ============================================================================
// NOTE: 이 스키마는 Auth 전용 응답 형식입니다.
// 일반 API 응답은 project-context.md의 표준 형식을 따릅니다:
// { success: true, data: T } 또는 { success: false, error: { code, message } }
// Auth 응답은 Supabase Auth 패턴과 일관성을 위해 단순화된 형식을 사용합니다.

export const AuthErrorSchema = z.object({
  error: z.string(),
});

export const AuthSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export const AuthResponseSchema = z.union([AuthErrorSchema, AuthSuccessSchema]);

export type AuthError = z.infer<typeof AuthErrorSchema>;
export type AuthSuccess = z.infer<typeof AuthSuccessSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
