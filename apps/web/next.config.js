const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ['src'],
  },
  transpilePackages: ['@job-tracker/shared'],
}

// Sentry 설정
const sentryWebpackPluginOptions = {
  // 소스맵 업로드 설정
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // 빌드 시 소스맵 업로드 여부
  silent: !process.env.CI,

  // 클라이언트 번들에서 소스맵 숨기기
  hideSourceMaps: true,

  // 빌드 시 Sentry CLI 사용 여부
  disableLogger: true,

  // 자동으로 release 이름 설정
  automaticVercelMonitors: true,
}

// Sentry DSN이 설정된 경우에만 Sentry 래핑
module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig
