import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 프로덕션에서는 100% 샘플링
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.1,

  // 디버그 모드 (개발 환경에서만)
  debug: false,

  // 환경 설정
  environment: process.env.NODE_ENV,

  // 무시할 에러 패턴
  ignoreErrors: [
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],

  // 민감한 데이터 스크러빙
  beforeSend(event) {
    // 사용자 이메일 마스킹
    if (event.user?.email) {
      const [local, domain] = event.user.email.split('@')
      if (local && domain) {
        event.user.email = `${local.slice(0, 2)}***@${domain}`
      }
    }

    // 요청 데이터에서 민감한 헤더 제거
    if (event.request?.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
      sensitiveHeaders.forEach((header) => {
        if (event.request?.headers?.[header]) {
          event.request.headers[header] = '[REDACTED]'
        }
      })
    }

    return event
  },
})
