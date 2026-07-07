import { Suspense } from 'react'
import { requireUserId } from '@/lib/auth/get-user'
import { fetchApplications } from '@/lib/queries/applications'
import { ApplicationList } from '@/components/features/applications/application-list'
import { ApplicationFilters } from '@/components/features/applications/application-filters'
import { Skeleton } from '@/components/ui/skeleton'
import type { Platform } from '@job-tracker/shared'

interface ApplicationsPageProps {
  searchParams: Promise<{
    q?: string
    platform?: Platform
  }>
}

function FiltersSkeleton() {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Skeleton className="h-10 w-[300px]" />
      <Skeleton className="h-10 w-[140px]" />
    </div>
  )
}

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const params = await searchParams

  // 사용자 ID 가져오기 (로그인 필수)
  const userId = await requireUserId()

  const applicationsResult = await fetchApplications(userId, {
    search: params.q,
    platform: params.platform,
  })

  if (applicationsResult.error) {
    throw applicationsResult.error
  }

  const applications = applicationsResult.data

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">저장한 공고</h2>
        <p className="text-sm text-muted-foreground">
          총 {applications.length}건
        </p>
      </div>
      <Suspense fallback={<FiltersSkeleton />}>
        <ApplicationFilters />
      </Suspense>
      <ApplicationList applications={applications} />
    </div>
  )
}
