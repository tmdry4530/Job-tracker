/**
 * Extension 타입 정의
 */

/** 지원 플랫폼 */
export type Platform = 'wanted' | 'saramin'

/** 지원 상태 */
export type ApplicationStatus =
  | 'applied'
  | 'document_passed'
  | 'interview'
  | 'accepted'
  | 'rejected'

/**
 * Extension에서 저장하는 세션 정보 타입
 */
export interface StoredSession {
  access_token: string
  refresh_token: string
  expires_at: number
  user: {
    id: string
    email: string
  }
}

/**
 * Background Script와 Content Script 간 메시지 타입
 */
export interface SessionMessage {
  type: 'SESSION_UPDATE'
  session: StoredSession | null
}

/**
 * Popup에서 사용하는 인증 상태
 */
export interface AuthState {
  isAuthenticated: boolean
  userEmail: string | null
  isLoading: boolean
}

/**
 * 파싱된 지원 공고 데이터
 */
export interface ParsedApplication {
  companyName: string
  position: string
  appliedAt: string
  status: string
  sourceUrl: string
  jdContent?: string
  platform: Platform
}

/**
 * 파싱 성공 결과
 */
export interface ParseSuccessPayload {
  platform: Platform
  applications: ParsedApplication[]
  timestamp: number
}

/**
 * 파싱 실패 결과
 */
export interface ParseFailPayload {
  platform: Platform
  error: string
  timestamp: number
}

/**
 * 파싱 결과 메시지 (Content Script → Background)
 */
export type ParseMessage =
  | { type: 'PARSE_COMPLETED'; payload: ParseSuccessPayload }
  | { type: 'PARSE_FAILED'; payload: ParseFailPayload }

/**
 * 파싱 상태 저장용
 */
export interface ParseState {
  lastParsed: {
    wanted?: number
    saramin?: number
  }
  pendingApplications: ParsedApplication[]
}

/**
 * 동기화 성공 결과
 */
export interface SyncSuccessResult {
  syncedCount: number
  skippedCount: number
  timestamp: number
}

/**
 * 동기화 실패 결과
 */
export interface SyncErrorResult {
  error: string
  timestamp: number
}

/**
 * 동기화 결과 (성공 또는 실패)
 */
export type SyncResult = SyncSuccessResult | SyncErrorResult

/**
 * 동기화 메시지
 */
export interface SyncMessage {
  type: 'SYNC_REQUEST' | 'SYNC_COMPLETED' | 'SYNC_FAILED'
  payload?: SyncResult
}

/**
 * JD 수집 메시지 (공고 상세 페이지에서 수집)
 */
export interface JdCollectMessage {
  type: 'JD_COLLECTED'
  payload: {
    platform: Platform
    companyName: string
    position: string
    jdContent: string
    sourceUrl: string
    timestamp: number
    isImageBased?: boolean
    imageUrls?: string[]
  }
}

/**
 * Popup에서 Background로 보내는 요청 메시지
 */
export interface PopupMessage {
  type: 'GET_PENDING_APPLICATIONS' | 'SYNC_REQUEST' | 'CLEAR_PENDING'
}

/**
 * 모든 Extension 메시지 타입 유니온
 */
export type ExtensionMessage =
  | SessionMessage
  | ParseMessage
  | SyncMessage
  | PopupMessage
  | JdCollectMessage

/**
 * 타입 가드: SyncResult가 성공인지 확인
 */
export function isSyncSuccess(result: SyncResult): result is SyncSuccessResult {
  return 'syncedCount' in result
}

/**
 * 타입 가드: SyncResult가 실패인지 확인
 */
export function isSyncError(result: SyncResult): result is SyncErrorResult {
  return 'error' in result
}
