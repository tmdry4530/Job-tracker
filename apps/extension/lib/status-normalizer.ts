/**
 * 북마크 상태 정규화 유틸리티
 * 북마크는 기본적으로 'saved' 상태로 저장됨
 */

export type BookmarkStatus = 'saved' | 'applied' | 'closed'

// 하위 호환성을 위한 별칭
export type ApplicationStatus = BookmarkStatus

/**
 * 북마크 기본 상태 반환
 * 북마크/스크랩 공고는 기본적으로 'saved' 상태
 */
export function getDefaultBookmarkStatus(): BookmarkStatus {
  return 'saved'
}

/**
 * 원티드 상태 정규화 (하위 호환성)
 * @deprecated 북마크에서는 상태 정규화가 필요 없음
 */
export function normalizeWantedStatus(_statusText: string): BookmarkStatus {
  return 'saved'
}

/**
 * 사람인 상태 정규화 (하위 호환성)
 * @deprecated 북마크에서는 상태 정규화가 필요 없음
 */
export function normalizeSaraminStatus(_statusText: string): BookmarkStatus {
  return 'saved'
}

/**
 * API 상태 정규화 (하위 호환성)
 * @deprecated 북마크에서는 상태 정규화가 필요 없음
 */
export function normalizeApiStatus(_status: string): BookmarkStatus {
  return 'saved'
}
