import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchApplications } from '@/lib/queries/applications'
import { ApplicationList } from '@/components/features/applications/application-list'
import { ApplicationFilters } from '@/components/features/applications/application-filters'
import { Skeleton } from '@/components/ui/skeleton'
import type { Application, ApplicationStatus, Platform } from '@job-tracker/shared'

interface ApplicationsPageProps {
  searchParams: Promise<{
    q?: string
    platform?: Platform
    status?: ApplicationStatus
    duplicates?: string
  }>
}

/**
 * 중복 지원 공고만 필터링
 * 같은 회사+포지션 조합이 2개 이상인 경우
 */
function filterDuplicates(applications: Application[]): Application[] {
  const counts = new Map<string, number>()

  // 회사+포지션 조합 카운트
  for (const app of applications) {
    const key = `${app.company_name.toLowerCase()}_${app.position.toLowerCase()}`
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  // 2개 이상인 것만 필터
  return applications.filter((app) => {
    const key = `${app.company_name.toLowerCase()}_${app.position.toLowerCase()}`
    return (counts.get(key) || 0) >= 2
  })
}

function FiltersSkeleton() {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Skeleton className="h-10 w-[300px]" />
      <Skeleton className="h-10 w-[140px]" />
      <Skeleton className="h-10 w-[140px]" />
    </div>
  )
}

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: allApplications, error } = await fetchApplications(supabase, {
    search: params.q,
    platform: params.platform,
    status: params.status,
  })

  if (error) {
    throw error
  }

  // 중복 필터 적용
  const showDuplicates = params.duplicates === 'true'
  const applications = showDuplicates
    ? filterDuplicates(allApplications)
    : allApplications

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">지원 현황</h2>
        <p className="text-sm text-muted-foreground">
          {showDuplicates ? `중복 ${applications.length}건` : `총 ${applications.length}건`}
        </p>
      </div>
      <Suspense fallback={<FiltersSkeleton />}>
        <ApplicationFilters />
      </Suspense>
      <ApplicationList applications={applications} />
    </div>
  )
}
