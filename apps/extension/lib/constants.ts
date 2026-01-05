/**
 * Extension 공통 상수
 */

/** 타임아웃 설정 (밀리초) */
export const TIMEOUTS = {
  /** DOM 로드 대기 */
  DOM_LOAD: 1000,
  /** React 렌더링 대기 */
  REACT_RENDER: 2000,
  /** iframe 로드 대기 */
  IFRAME_LOAD: 3000,
  /** API 인터셉터 대기 */
  API_INTERCEPT: 3000,
  /** 페이지 로드 최대 대기 */
  PAGE_LOAD_MAX: 10000,
  /** 사람인 페이지 로드 */
  SARAMIN_PAGE_LOAD: 15000,
  /** 셀렉터 체크 인터벌 */
  SELECTOR_CHECK_INTERVAL: 500,
  /** API 데이터 체크 인터벌 */
  API_DATA_CHECK_INTERVAL: 200,
} as const

/** 동기화 설정 */
export const SYNC = {
  /** 배치 처리 크기 */
  BATCH_SIZE: 10,
  /** 최대 JD 길이 */
  MAX_JD_LENGTH: 10000,
  /** 최대 셀렉터 체크 횟수 */
  MAX_SELECTOR_CHECKS: 20,
} as const

/** 배지 색상 */
export const BADGE_COLORS = {
  SUCCESS: '#10B981',
  ERROR: '#EF4444',
} as const

/** 플랫폼 URL 패턴 */
export const PLATFORM_URLS = {
  WANTED_JD: 'wanted.co.kr/wd/',
  SARAMIN_JD: 'saramin.co.kr/zf_info/',
} as const
