'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, Check } from 'lucide-react'
import { STATUS_LABELS, STATUS_COLORS, APPLICATION_STATUSES } from '@job-tracker/shared'
import { updateApplicationStatus } from '@/app/(dashboard)/applications/actions'
import type { ApplicationStatus } from '@job-tracker/shared'

interface StatusDropdownProps {
  applicationId: string
  currentStatus: ApplicationStatus
}

export function StatusDropdown({ applicationId, currentStatus }: StatusDropdownProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useState(currentStatus)

  async function handleStatusChange(newStatus: ApplicationStatus) {
    if (newStatus === optimisticStatus) return

    const previousStatus = optimisticStatus
    setOptimisticStatus(newStatus) // Optimistic update

    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, newStatus)

      if (!result.success) {
        setOptimisticStatus(previousStatus) // Rollback on error
        toast.error(result.error || '상태 변경에 실패했습니다')
      } else {
        toast.success('상태가 변경되었습니다')
        router.refresh()
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 font-normal"
          style={{ color: STATUS_COLORS[optimisticStatus] }}
          disabled={isPending}
        >
          {STATUS_LABELS[optimisticStatus]}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {APPLICATION_STATUSES.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            className="flex items-center justify-between"
          >
            <span style={{ color: STATUS_COLORS[status] }}>
              {STATUS_LABELS[status]}
            </span>
            {status === optimisticStatus && (
              <Check className="h-4 w-4 ml-2" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
