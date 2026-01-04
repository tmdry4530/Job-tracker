/**
 * Types Barrel Export
 * 모든 타입 정의 통합 export
 */

// Platform types
export type { Platform, PlatformType } from './platform';
export { PLATFORMS } from './platform';

// Application types
export type {
  ApplicationStatus,
  ApplicationStatusType,
  Application,
  ApplicationInsert,
  ApplicationUpdate,
  QuestionCategory,
  JdSummary,
  JdSummaryInsert,
  JdSummaryUpdate,
  InterviewQuestion,
  InterviewQuestionInsert,
  InterviewQuestionUpdate,
} from './application';
export { APPLICATION_STATUSES, QUESTION_CATEGORIES } from './application';

// User types
export type { User, UserSession } from './user';

// API types
export type { ApiErrorCode, ApiResponse, ApiError, ApiResult } from './api';
export { isApiSuccess, isApiError } from './api';

// Database types
export type { Database } from './database';
