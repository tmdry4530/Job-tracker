'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const authKey = searchParams.get('authKey')
    const customerKey = searchParams.get('customerKey')

    if (!authKey || !customerKey) {
      setStatus('error')
      setError('잘못된 요청입니다.')
      return
    }

    async function processPayment() {
      try {
        const response = await fetch('/api/payment/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            authKey,
            customerKey,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '결제 처리에 실패했습니다.')
        }

        setStatus('success')
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.')
      }
    }

    processPayment()
  }, [searchParams])

  const handleGoToApplications = () => {
    router.push('/applications')
  }

  const handleRetry = () => {
    router.push('/applications')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {status === 'loading' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle>결제 처리 중</CardTitle>
              <CardDescription>잠시만 기다려주세요...</CardDescription>
            </CardHeader>
          </>
        )}

        {status === 'success' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle>결제 완료!</CardTitle>
              <CardDescription>
                Premium 구독이 활성화되었습니다.
                이제 무제한으로 지원 내역을 저장할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGoToApplications} className="w-full">
                지원 현황으로 이동
              </Button>
            </CardContent>
          </>
        )}

        {status === 'error' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle>결제 실패</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleRetry} className="w-full">
                다시 시도
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
