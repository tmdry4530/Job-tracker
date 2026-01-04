'use client'

import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusDropdown } from './status-dropdown'
import { PlatformBadge } from './platform-badge'
import { EmptyState } from './empty-state'
import { formatDate } from '@job-tracker/shared'
import type { Application } from '@job-tracker/shared'

interface ApplicationListProps {
  applications: Application[]
}

export function ApplicationList({ applications }: ApplicationListProps) {
  if (applications.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">플랫폼</TableHead>
            <TableHead>회사명</TableHead>
            <TableHead>포지션</TableHead>
            <TableHead className="w-[120px]">지원일</TableHead>
            <TableHead className="w-[100px]">상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id} className="cursor-pointer hover:bg-muted/50">
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
              <TableCell className="text-sm text-muted-foreground">
                {application.applied_at ? formatDate(application.applied_at) : '-'}
              </TableCell>
              <TableCell>
                <StatusDropdown
                  applicationId={application.id}
                  currentStatus={application.status}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
