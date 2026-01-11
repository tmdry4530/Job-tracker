'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STATUS_LABELS, APPLICATION_STATUSES } from '@job-tracker/shared'

export function StatusFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentStatus = searchParams.get('status') || 'all'

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'all') {
      params.delete('status')
    } else {
      params.set('status', value)
    }

    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="상태" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체 상태</SelectItem>
        {APPLICATION_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
