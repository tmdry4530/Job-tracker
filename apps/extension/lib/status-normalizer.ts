/**
 * 지원 상태 정규화 유틸리티
 * 플랫폼별 상태 텍스트를 표준 상태로 변환
 */

export type ApplicationStatus =
  | 'applied'
  | 'document_passed'
  | 'interview'
  | 'accepted'
  | 'rejected'

/** 공통 상태 매핑 */
const COMMON_STATUS_MAP: Record<string, ApplicationStatus> = {
  '지원완료': 'applied',
  '지원 완료': 'applied',
  '접수': 'applied',
  '접수완료': 'applied',
  '서류통과': 'document_passed',
  '서류 통과': 'document_passed',
  '서류합격': 'document_passed',
  '서류 합격': 'document_passed',
  '면접진행': 'interview',
  '면접 진행': 'interview',
  '면접': 'interview',
  '최종합격': 'accepted',
  '최종 합격': 'accepted',
  '합격': 'accepted',
  '불합격': 'rejected',
  '탈락': 'rejected',
  '서류불합격': 'rejected',
  '서류 불합격': 'rejected',
}

/** 원티드 전용 상태 매핑 */
const WANTED_STATUS_MAP: Record<string, ApplicationStatus> = {
  ...COMMON_STATUS_MAP,
  '1차 합격': 'document_passed',
}

/** 사람인 전용 상태 매핑 */
const SARAMIN_STATUS_MAP: Record<string, ApplicationStatus> = {
  ...COMMON_STATUS_MAP,
  '서류접수': 'applied',
  '면접예정': 'interview',
  '면접 예정': 'interview',
  '면접대기': 'interview',
  '채용': 'accepted',
  '미달': 'rejected',
  '마감': 'rejected',
}

/** API 상태 매핑 (원티드 API 응답용) */
const API_STATUS_MAP: Record<string, ApplicationStatus> = {
  'complete': 'applied',
  'applied': 'applied',
  'hiring_complete': 'accepted',
  'accepted': 'accepted',
  'rejected': 'rejected',
  'interview': 'interview',
  'document_passed': 'document_passed',
}

/**
 * 원티드 상태 텍스트를 표준 상태로 변환
 */
export function normalizeWantedStatus(statusText: string): ApplicationStatus {
  const normalized = statusText.trim()
  return WANTED_STATUS_MAP[normalized] || 'applied'
}

/**
 * 사람인 상태 텍스트를 표준 상태로 변환
 */
export function normalizeSaraminStatus(statusText: string): ApplicationStatus {
  const normalized = statusText.trim()
  return SARAMIN_STATUS_MAP[normalized] || 'applied'
}

/**
 * API 상태값을 표준 상태로 변환 (원티드 API)
 */
export function normalizeApiStatus(status: string): ApplicationStatus {
  return API_STATUS_MAP[status?.toLowerCase()] || 'applied'
}
