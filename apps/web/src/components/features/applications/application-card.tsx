'use client'

import Link from 'next/link'
import { MessageSquare, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusDropdown } from './status-dropdown'
import { PlatformBadge } from './platform-badge'
import { BookmarkButton } from './bookmark-button'
import { formatDate } from '@job-tracker/shared'
import type { Application } from '@job-tracker/shared'

interface ApplicationCardProps {
  application: Application
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
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
            <p className="text-xs text-muted-foreground mt-2">
              {application.applied_at ? formatDate(application.applied_at) : '-'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <BookmarkButton
              applicationId={application.id}
              isBookmarked={application.is_bookmarked}
              size="sm"
            />
            <StatusDropdown
              applicationId={application.id}
              currentStatus={application.status}
            />
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
