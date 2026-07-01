'use client'

import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlatformBadge } from './platform-badge'
import { EmptyState } from './empty-state'
import { BookmarkButton } from './bookmark-button'
import { ApplicationCard } from './application-card'
import { DeadlineBadge } from './deadline-badge'
import { DeleteDialog } from './delete-dialog'
import type { Application } from '@job-tracker/shared'

interface ApplicationListProps {
  applications: Application[]
}

export function ApplicationList({ applications }: ApplicationListProps) {
  if (applications.length === 0) {
    return <EmptyState />
  }

  return (
    <>
      {/* 모바일: 카드 뷰 */}
      <div className="space-y-3 md:hidden">
        {applications.map((application) => (
          <ApplicationCard key={application.id} application={application} />
        ))}
      </div>

      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[100px]">플랫폼</TableHead>
              <TableHead>회사명</TableHead>
              <TableHead>포지션</TableHead>
              <TableHead className="w-[100px]">마감일</TableHead>
              <TableHead className="w-[50px]"><span className="sr-only">작업</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="pr-0">
                  <div className="flex items-center gap-1">
                    <BookmarkButton
                      applicationId={application.id}
                      isBookmarked={application.is_favorite}
                      size="sm"
                    />
                    {application.memo && (
                      <MessageSquare className="h-4 w-4 text-muted-foreground" aria-label="메모 있음" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <PlatformBadge platform={application.platform} />
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/applications/${application.id}`}
                    className="hover:underline"
                  >
                    {application.company_name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {application.position}
                </TableCell>
                <TableCell>
                  <DeadlineBadge deadline={application.deadline} />
                </TableCell>
                <TableCell className="pl-0 text-right">
                  <DeleteDialog applicationId={application.id} redirect={false} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
