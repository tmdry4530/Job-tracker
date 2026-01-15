/**
 * Types Barrel Export
 * 모든 타입 정의 통합 export
 */

// Platform types
export type { Platform, PlatformType } from './platform';
export { PLATFORMS } from './platform';

// Application (Bookmark) types
export type {
  BookmarkStatus,
  BookmarkStatusType,
  Bookmark,
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
export { BOOKMARK_STATUSES, APPLICATION_STATUSES, QUESTION_CATEGORIES } from './application';

// User types
export type { User, UserSession } from './user';

// API types
export type { ApiErrorCode, ApiResponse, ApiError, ApiResult } from './api';
export { isApiSuccess, isApiError } from './api';

// Database types
export type { Database } from './database';

// Plan types
export type {
  PlanType,
  UserPlan,
  UserPlanInsert,
  UserPlanUpdate,
  PlanLimits,
  PlanUsage,
} from './plan';
export { PLAN_TYPES, PLAN_LIMITS } from './plan';

// Payment types
export type {
  PaymentStatus,
  SubscriptionStatus,
  Subscription,
  SubscriptionInsert,
  SubscriptionUpdate,
  PaymentHistory,
  PaymentHistoryInsert,
  TossPaymentBillingKey,
  TossPaymentResponse,
  TossPaymentError,
  CreateSubscriptionRequest,
  CancelSubscriptionRequest,
  PaymentResult,
} from './payment';
export { PREMIUM_PRICE } from './payment';
