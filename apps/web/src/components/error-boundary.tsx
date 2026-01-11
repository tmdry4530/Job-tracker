'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Sentry에 에러 보고
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-destructive">
          오류가 발생했습니다
        </h2>
        <p className="mt-2 text-muted-foreground">
          일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-4 max-w-lg overflow-auto rounded bg-muted p-4 text-left text-sm">
            {error.message}
          </pre>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline">
          다시 시도
        </Button>
        <Button onClick={() => (window.location.href = '/')}>
          홈으로 이동
        </Button>
      </div>
    </div>
  )
}
