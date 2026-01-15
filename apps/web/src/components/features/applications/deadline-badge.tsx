'use client'

import { cn } from '@/lib/utils'

interface DeadlineBadgeProps {
  deadline: string | null | undefined
}

/**
 * D-day 계산 및 표시
 */
function getDdayInfo(deadline: string): { text: string; variant: 'urgent' | 'soon' | 'normal' | 'expired' } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const deadlineDate = new Date(deadline)
  deadlineDate.setHours(0, 0, 0, 0)

  const diffTime = deadlineDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { text: '마감', variant: 'expired' }
  }

  if (diffDays === 0) {
    return { text: 'D-Day', variant: 'urgent' }
  }

  if (diffDays <= 3) {
    return { text: `D-${diffDays}`, variant: 'urgent' }
  }

  if (diffDays <= 7) {
    return { text: `D-${diffDays}`, variant: 'soon' }
  }

  return { text: `D-${diffDays}`, variant: 'normal' }
}

export function DeadlineBadge({ deadline }: DeadlineBadgeProps) {
  if (!deadline) {
    return <span className="text-sm text-muted-foreground">-</span>
  }

  const { text, variant } = getDdayInfo(deadline)

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap',
        variant === 'urgent' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        variant === 'soon' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        variant === 'normal' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        variant === 'expired' && 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
      )}
    >
      {text}
    </span>
  )
}
