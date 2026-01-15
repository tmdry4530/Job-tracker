/**
 * Schemas Barrel Export
 * 모든 Zod 스키마 통합 export
 */

// Platform schemas
export { PlatformSchema } from './application';
export type { PlatformFromSchema } from './application';

// Application (Bookmark) schemas
export {
  BookmarkStatusSchema,
  BookmarkSchema,
  ApplicationStatusSchema,
  QuestionCategorySchema,
  ApplicationSchema,
  ApplicationInsertSchema,
  ApplicationUpdateSchema,
  JdSummarySchema,
  InterviewQuestionSchema,
} from './application';
export type {
  BookmarkStatusFromSchema,
  BookmarkFromSchema,
  ApplicationStatusFromSchema,
  QuestionCategoryFromSchema,
  ApplicationFromSchema,
  ApplicationInsertFromSchema,
  ApplicationUpdateFromSchema,
  JdSummaryFromSchema,
  InterviewQuestionFromSchema,
} from './application';

// User schemas
export { UserSchema } from './application';
export type { UserFromSchema } from './application';

// API schemas
export {
  ApiErrorCodeSchema,
  ApiErrorSchema,
  createApiResponseSchema,
  createApiResultSchema,
} from './application';
export type { ApiErrorFromSchema } from './application';

// Auth schemas
export {
  SignupSchema,
  LoginSchema,
  AuthErrorSchema,
  AuthSuccessSchema,
  AuthResponseSchema,
} from './auth';
export type {
  SignupInput,
  LoginInput,
  AuthError,
  AuthSuccess,
  AuthResponse,
} from './auth';
