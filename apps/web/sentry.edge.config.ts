import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Edge 런타임에서는 샘플링 낮춤
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.5 : 0.1,

  // 디버그 모드 끔
  debug: false,

  // 환경 설정
  environment: process.env.NODE_ENV,
})
