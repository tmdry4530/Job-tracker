'use client'

import type { Subscription } from '@job-tracker/shared'
import { PREMIUM_PRICE } from '@job-tracker/shared'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CancelSubscriptionButton } from './cancel-subscription-button'
import { CreditCard, Calendar, CheckCircle, AlertCircle } from 'lucide-react'

interface SubscriptionStatusProps {
  subscription: Subscription | null
}

export function SubscriptionStatus({ subscription }: SubscriptionStatusProps) {
  if (!subscription) {
    return null
  }

  const statusConfig = {
    active: {
      label: '활성',
      variant: 'default' as const,
      icon: CheckCircle,
    },
    cancelled: {
      label: '취소됨',
      variant: 'secondary' as const,
      icon: AlertCircle,
    },
    expired: {
      label: '만료됨',
      variant: 'destructive' as const,
      icon: AlertCircle,
    },
    past_due: {
      label: '결제 실패',
      variant: 'destructive' as const,
      icon: AlertCircle,
    },
  }

  const status = statusConfig[subscription.status]
  const StatusIcon = status.icon

  const nextPaymentDate = new Date(subscription.current_period_end).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            구독 정보
          </CardTitle>
          <Badge variant={status.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
        <CardDescription>
          Premium 월간 구독 - {PREMIUM_PRICE.monthly.toLocaleString()}원/월
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription.card_number && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>
              {subscription.card_company} **** {subscription.card_number.slice(-4)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {subscription.status === 'active'
              ? `다음 결제일: ${nextPaymentDate}`
              : `만료일: ${nextPaymentDate}`}
          </span>
        </div>

        {subscription.status === 'active' && (
          <div className="pt-2">
            <CancelSubscriptionButton expiresAt={subscription.current_period_end} />
          </div>
        )}

        {subscription.status === 'past_due' && (
          <p className="text-sm text-destructive">
            결제에 실패했습니다. 카드 정보를 확인해주세요.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
