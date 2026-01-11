import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 개발 환경에서는 10%, 프로덕션에서는 100% 샘플링
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.1,

  // 에러 리플레이 설정
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // 디버그 모드 (개발 환경에서만)
  debug: false,

  // 환경 설정
  environment: process.env.NODE_ENV,

  // 무시할 에러 패턴
  ignoreErrors: [
    // 브라우저 확장 프로그램 에러
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // 네트워크 에러
    'Failed to fetch',
    'NetworkError',
    'AbortError',
    // 사용자 중단
    'AbortError: The user aborted a request',
  ],

  // 브레드크럼 설정
  beforeBreadcrumb(breadcrumb) {
    // 민감한 정보가 포함된 breadcrumb 필터링
    if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
      const url = breadcrumb.data?.url as string | undefined
      if (url?.includes('/api/auth')) {
        return null
      }
    }
    return breadcrumb
  },
})
