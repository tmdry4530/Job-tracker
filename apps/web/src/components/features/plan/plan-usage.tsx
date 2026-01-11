'use client'

import { AlertCircle, CheckCircle, Infinity } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PlanBadge } from './plan-badge'
import type { PlanUsage } from '@job-tracker/shared'

interface PlanUsageProps {
  usage: PlanUsage
}

export function PlanUsageDisplay({ usage }: PlanUsageProps) {
  const { plan, currentCount, limit, isUnlimited, percentUsed, canAddMore } = usage
  const isNearLimit = !isUnlimited && percentUsed >= 80
  const isAtLimit = !isUnlimited && !canAddMore

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">현재 플랜</span>
          <PlanBadge planType={plan.plan_type} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">저장된 지원 내역</span>
          <span className="font-medium">
            {currentCount}
            {isUnlimited ? (
              <span className="text-muted-foreground ml-1">
                / <Infinity className="inline h-4 w-4" />
              </span>
            ) : (
              <span className="text-muted-foreground"> / {limit}</span>
            )}
          </span>
        </div>

        {!isUnlimited && (
          <Progress
            value={percentUsed}
            className={isAtLimit ? 'bg-destructive/20' : isNearLimit ? 'bg-yellow-100' : ''}
          />
        )}
      </div>

      {isAtLimit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            지원 내역 저장 한도에 도달했습니다. Premium으로 업그레이드하여 무제한으로 저장하세요.
          </AlertDescription>
        </Alert>
      )}

      {isNearLimit && !isAtLimit && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            저장 한도의 {percentUsed}%를 사용 중입니다. Premium으로 업그레이드하면 무제한으로 저장할 수 있습니다.
          </AlertDescription>
        </Alert>
      )}

      {isUnlimited && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>무제한 저장 가능</span>
        </div>
      )}
    </div>
  )
}
