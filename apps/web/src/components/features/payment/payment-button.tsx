'use client'

import { useState } from 'react'
import { loadTossPayments } from '@tosspayments/payment-sdk'
import { Button } from '@/components/ui/button'
import { PREMIUM_PRICE } from '@job-tracker/shared'
import { CreditCard, Loader2 } from 'lucide-react'

interface PaymentButtonProps {
  userId: string
  userEmail: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function PaymentButton({
  userId,
  userEmail,
  onSuccess,
  onError,
}: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handlePayment = async () => {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY

    if (!clientKey) {
      onError?.('결제 시스템이 설정되지 않았습니다.')
      return
    }

    setIsLoading(true)

    try {
      const tossPayments = await loadTossPayments(clientKey)

      // 빌링키 발급 요청 (자동결제용 카드 등록)
      await tossPayments.requestBillingAuth('카드', {
        customerKey: userId,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: userEmail,
      })

      onSuccess?.()
    } catch (error) {
      console.error('Payment error:', error)
      onError?.(error instanceof Error ? error.message : '결제 요청에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={isLoading}
      className="w-full"
      size="lg"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          처리 중...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Premium 구독 ({PREMIUM_PRICE.monthly.toLocaleString()}원/월)
        </>
      )}
    </Button>
  )
}
