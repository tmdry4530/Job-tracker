/**
 * API Types
 * API 응답 및 에러 타입 정의
 */

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR'
  | 'AI_SERVICE_UNAVAILABLE'
  | 'AI_RATE_LIMITED';

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

/**
 * Type guard to check if result is successful
 */
export function isApiSuccess<T>(result: ApiResult<T>): result is ApiResponse<T> {
  return result.success === true;
}

/**
 * Type guard to check if result is an error
 */
export function isApiError<T>(result: ApiResult<T>): result is ApiError {
  return result.success === false;
}
