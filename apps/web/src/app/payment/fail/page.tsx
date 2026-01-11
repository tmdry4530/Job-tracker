'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'

export default function PaymentFailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const code = searchParams.get('code')
  const message = searchParams.get('message')

  const handleRetry = () => {
    router.push('/applications')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle>결제 실패</CardTitle>
          <CardDescription>
            {message || '결제 처리 중 오류가 발생했습니다.'}
          </CardDescription>
          {code && (
            <p className="text-xs text-muted-foreground mt-2">
              오류 코드: {code}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Button onClick={handleRetry} className="w-full">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
