/**
 * 에러 처리 유틸리티
 */

/** 에러 응답 타입 */
export interface ErrorResponse {
  success: false
  error: string
  timestamp: number
}

/** 성공 응답 타입 */
export interface SuccessResponse<T> {
  success: true
  data: T
  timestamp: number
}

/** API 응답 타입 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse

/**
 * 에러 메시지 추출
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return '알 수 없는 오류'
}

/**
 * 에러 응답 생성
 */
export function createErrorResponse(error: unknown): ErrorResponse {
  return {
    success: false,
    error: getErrorMessage(error),
    timestamp: Date.now(),
  }
}

/**
 * 성공 응답 생성
 */
export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  }
}
