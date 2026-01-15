import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchApplications } from '@/lib/queries/applications'
import { fetchPlanUsage } from '@/lib/queries/plan'
import { ApplicationList } from '@/components/features/applications/application-list'
import { ApplicationFilters } from '@/components/features/applications/application-filters'
import { PlanBadge } from '@/components/features/plan'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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
  const supabase = await createClient()

  // 사용자 ID 가져오기
  const { data: { user } } = await supabase.auth.getUser()

  const [applicationsResult, planResult] = await Promise.all([
    fetchApplications(supabase, {
      search: params.q,
      platform: params.platform,
    }),
    user ? fetchPlanUsage(supabase, user.id) : Promise.resolve({ data: null, error: null }),
  ])

  if (applicationsResult.error) {
    throw applicationsResult.error
  }

  const applications = applicationsResult.data
  const planUsage = planResult.data

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">저장한 공고</h2>
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
            총 {applications.length}건
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
