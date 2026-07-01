'use client'

import Link from 'next/link'
import { MessageSquare, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { PlatformBadge } from './platform-badge'
import { BookmarkButton } from './bookmark-button'
import { DeadlineBadge } from './deadline-badge'
import { DeleteDialog } from './delete-dialog'
import type { Application } from '@job-tracker/shared'

interface ApplicationCardProps {
  application: Application
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
}

export function ApplicationCard({
  application,
  isSelected,
  onToggleSelect,
}: ApplicationCardProps) {
  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-1 min-w-0 items-start gap-3">
            {onToggleSelect && (
              <Checkbox
                className="mt-1"
                checked={isSelected ?? false}
                onCheckedChange={() => onToggleSelect(application.id)}
                aria-label={`${application.company_name} 선택`}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <PlatformBadge platform={application.platform} />
                {application.memo && (
                  <MessageSquare className="h-3 w-3 text-muted-foreground" aria-label="메모 있음" />
                )}
              </div>
              <Link
                href={`/applications/${application.id}`}
                className="block group"
              >
                <h3 className="font-medium truncate group-hover:underline">
                  {application.company_name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {application.position}
                </p>
              </Link>
              <div className="mt-1">
                <DeadlineBadge deadline={application.deadline} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <BookmarkButton
              applicationId={application.id}
              isBookmarked={application.is_favorite}
              size="sm"
            />
            <DeleteDialog applicationId={application.id} redirect={false} />
          </div>
        </div>
        <Link
          href={`/applications/${application.id}`}
          className="flex items-center justify-center gap-1 mt-3 pt-3 border-t text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          상세 보기
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
