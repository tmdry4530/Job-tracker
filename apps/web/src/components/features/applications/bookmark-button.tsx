'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleFavorite } from '@/app/(dashboard)/applications/actions'
import { cn } from '@/lib/utils'

interface BookmarkButtonProps {
  applicationId: string
  isBookmarked: boolean
  size?: 'sm' | 'default'
}

export function BookmarkButton({
  applicationId,
  isBookmarked,
  size = 'default',
}: BookmarkButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticBookmarked, setOptimisticBookmarked] = useState(isBookmarked)

  const handleToggle = () => {
    const newValue = !optimisticBookmarked
    setOptimisticBookmarked(newValue)

    startTransition(async () => {
      const result = await toggleFavorite(applicationId, newValue)
      if (!result.success) {
        // 실패 시 롤백
        setOptimisticBookmarked(!newValue)
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'icon' : 'default'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        handleToggle()
      }}
      disabled={isPending}
      className={cn(
        size === 'sm' ? 'h-8 w-8' : 'gap-2',
        optimisticBookmarked && 'text-yellow-500 hover:text-yellow-600'
      )}
      aria-label={optimisticBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
    >
      <Star
        className={cn(
          size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
          optimisticBookmarked && 'fill-current'
        )}
      />
      {size === 'default' && (
        <span>{optimisticBookmarked ? '즐겨찾기' : '즐겨찾기'}</span>
      )}
    </Button>
  )
}
