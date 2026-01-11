'use client'

import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PLAN_LIMITS, PREMIUM_PRICE } from '@job-tracker/shared'
import { PaymentButton } from '@/components/features/payment'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface UpgradeCardProps {
  userId: string
  userEmail: string
}

export function UpgradeCard({ userId, userEmail }: UpgradeCardProps) {
  const [error, setError] = useState<string | null>(null)
  const premiumFeatures = PLAN_LIMITS.premium.features

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <CardTitle>Premium으로 업그레이드</CardTitle>
        </div>
        <CardDescription>
          더 많은 기능으로 취업 준비를 효율적으로 관리하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {premiumFeatures.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <PaymentButton
          userId={userId}
          userEmail={userEmail}
          onError={handleError}
        />

        <p className="text-xs text-center text-muted-foreground">
          월 {PREMIUM_PRICE.monthly.toLocaleString()}원 | 언제든지 취소 가능
        </p>
      </CardContent>
    </Card>
  )
}
