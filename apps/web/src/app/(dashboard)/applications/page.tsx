import { Suspense } from 'react'
import { requireUserId } from '@/lib/auth/get-user'
import { fetchApplications } from '@/lib/queries/applications'
import { fetchPlanUsage } from '@/lib/queries/plan'
import { ApplicationList } from '@/components/features/applications/application-list'
import { ApplicationFilters } from '@/components/features/applications/application-filters'
import { PlanBadge } from '@/components/features/plan'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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

  // 사용자 ID 가져오기 (로그인 필수)
  const userId = await requireUserId()

  const [applicationsResult, planResult] = await Promise.all([
    fetchApplications(userId, {
      search: params.q,
      platform: params.platform,
      status: params.status,
    }),
    fetchPlanUsage(userId),
  ])

  if (applicationsResult.error) {
    throw applicationsResult.error
  }

  const allApplications = applicationsResult.data
  const planUsage = planResult.data

  // 중복 필터 적용
  const showDuplicates = params.duplicates === 'true'
  const applications = showDuplicates
    ? filterDuplicates(allApplications)
    : allApplications

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">지원 현황</h2>
        <div className="flex items-center gap-4">
          {planUsage && (
            <div className="flex items-center gap-3">
              <PlanBadge planType={planUsage.plan.plan_type} />
              {!planUsage.isUnlimited && (
                <div className="flex items-center gap-2">
                  <Progress
                    value={planUsage.percentUsed}
                    className="w-20 h-2"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {planUsage.currentCount}/{planUsage.limit}
                  </span>
                </div>
              )}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {showDuplicates ? `중복 ${applications.length}건` : `총 ${applications.length}건`}
          </p>
        </div>
      </div>
      <Suspense fallback={<FiltersSkeleton />}>
        <ApplicationFilters />
      </Suspense>
      <ApplicationList applications={applications} />
    </div>
  )
}
