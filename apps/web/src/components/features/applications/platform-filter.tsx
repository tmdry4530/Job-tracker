'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PLATFORM_LABELS, PLATFORMS } from '@job-tracker/shared'

export function PlatformFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentPlatform = searchParams.get('platform') || 'all'

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'all') {
      params.delete('platform')
    } else {
      params.set('platform', value)
    }

    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }

  return (
    <Select value={currentPlatform} onValueChange={handleChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="플랫폼" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체 플랫폼</SelectItem>
        {PLATFORMS.map((platform) => (
          <SelectItem key={platform} value={platform}>
            {PLATFORM_LABELS[platform]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
