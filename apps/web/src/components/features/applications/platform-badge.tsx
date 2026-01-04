'use client'

import { Badge } from '@/components/ui/badge'
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@job-tracker/shared'
import type { Platform } from '@job-tracker/shared'

interface PlatformBadgeProps {
  platform: Platform
}

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  return (
    <Badge
      variant="outline"
      style={{ borderColor: PLATFORM_COLORS[platform], color: PLATFORM_COLORS[platform] }}
    >
      {PLATFORM_LABELS[platform]}
    </Badge>
  )
}
