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
  platform: 'wanted' | 'saramin'
}

/**
 * 파싱 결과 메시지 (Content Script → Background)
 */
export interface ParseMessage {
  type: 'PARSE_COMPLETED' | 'PARSE_FAILED'
  payload: {
    platform: 'wanted' | 'saramin'
    applications?: ParsedApplication[]
    error?: string
    timestamp: number
  }
}

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
 * 동기화 요청/결과 메시지
 */
export interface SyncMessage {
  type: 'SYNC_REQUEST' | 'SYNC_COMPLETED' | 'SYNC_FAILED'
  payload?: {
    syncedCount?: number
    skippedCount?: number
    error?: string
    timestamp: number
  }
}

/**
 * JD 수집 메시지 (공고 상세 페이지에서 수집)
 */
export interface JdCollectMessage {
  type: 'JD_COLLECTED'
  payload: {
    platform: 'wanted' | 'saramin'
    companyName: string
    position: string
    jdContent: string
    sourceUrl: string
    timestamp: number
    isImageBased?: boolean  // 이미지 기반 공고 여부 (사람인)
    imageUrls?: string[]    // OCR용 이미지 URL 목록
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
export type ExtensionMessage = SessionMessage | ParseMessage | SyncMessage | PopupMessage | JdCollectMessage
