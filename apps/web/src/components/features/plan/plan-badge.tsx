'use client'

import { Badge } from '@/components/ui/badge'
import type { PlanType } from '@job-tracker/shared'
import { cn } from '@/lib/utils'

interface PlanBadgeProps {
  planType: PlanType
  className?: string
}

export function PlanBadge({ planType, className }: PlanBadgeProps) {
  const isPremium = planType === 'premium'

  return (
    <Badge
      variant={isPremium ? 'default' : 'secondary'}
      className={cn(
        isPremium && 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0',
        className
      )}
    >
      {isPremium ? 'Premium' : 'Free'}
    </Badge>
  )
}
