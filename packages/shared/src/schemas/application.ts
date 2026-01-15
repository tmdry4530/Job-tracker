/**
 * Bookmark Schemas
 * Zod 스키마를 이용한 런타임 검증
 */

import { z } from 'zod';

// Platform Schema
export const PlatformSchema = z.enum(['wanted', 'saramin']);
export type PlatformFromSchema = z.infer<typeof PlatformSchema>;

// Bookmark Status Schema
export const BookmarkStatusSchema = z.enum(['saved', 'applied', 'closed']);
export type BookmarkStatusFromSchema = z.infer<typeof BookmarkStatusSchema>;

// 하위 호환성을 위한 별칭
export const ApplicationStatusSchema = BookmarkStatusSchema;
export type ApplicationStatusFromSchema = BookmarkStatusFromSchema;

// Question Category Schema
export const QuestionCategorySchema = z.enum([
  'technical',
  'experience',
  'situational',
  'general',
]);
export type QuestionCategoryFromSchema = z.infer<typeof QuestionCategorySchema>;

// Application (Bookmark) Schema
export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  platform: PlatformSchema,
  company_name: z.string().min(1, '회사명은 필수입니다'),
  position: z.string().min(1, '포지션은 필수입니다'),
  source_url: z.string().url('올바른 URL 형식이 아닙니다'),
  jd_content: z.string().nullable(),
  status: BookmarkStatusSchema,
  saved_at: z.string().datetime().nullable(),
  is_favorite: z.boolean(),
  memo: z.string().nullable(),
  deadline: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ApplicationFromSchema = z.infer<typeof ApplicationSchema>;

// 하위 호환성을 위한 별칭
export const BookmarkSchema = ApplicationSchema;
export type BookmarkFromSchema = ApplicationFromSchema;

// Application Insert Schema (id, created_at, updated_at are optional)
export const ApplicationInsertSchema = ApplicationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type ApplicationInsertFromSchema = z.infer<typeof ApplicationInsertSchema>;

// Application Update Schema (all fields optional)
export const ApplicationUpdateSchema = ApplicationInsertSchema.partial();
export type ApplicationUpdateFromSchema = z.infer<typeof ApplicationUpdateSchema>;

// JD Summary Schema
export const JdSummarySchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  user_id: z.string().uuid(),
  summary: z.string().min(1, '요약 내용은 필수입니다'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type JdSummaryFromSchema = z.infer<typeof JdSummarySchema>;

// Interview Question Schema
export const InterviewQuestionSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  user_id: z.string().uuid(),
  question: z.string().min(1, '질문 내용은 필수입니다'),
  category: QuestionCategorySchema.nullable(),
  created_at: z.string().datetime(),
});
export type InterviewQuestionFromSchema = z.infer<typeof InterviewQuestionSchema>;

// User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  created_at: z.string().datetime(),
});
export type UserFromSchema = z.infer<typeof UserSchema>;

// API Error Schema
export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INTERNAL_ERROR',
  'AI_SERVICE_UNAVAILABLE',
  'AI_RATE_LIMITED',
]);

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    details: z.record(z.array(z.string())).optional(),
  }),
});
export type ApiErrorFromSchema = z.infer<typeof ApiErrorSchema>;

// Generic API Response Schema factory
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

// Generic API Result Schema factory
export function createApiResultSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.discriminatedUnion('success', [
    createApiResponseSchema(dataSchema),
    ApiErrorSchema,
  ]);
}
