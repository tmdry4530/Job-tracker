'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">
              심각한 오류가 발생했습니다
            </h2>
            <p className="mt-2 text-gray-600">
              페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
            </p>
          </div>
          <button
            onClick={reset}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
