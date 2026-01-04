import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchApplications } from '@/lib/queries/applications'
import { ApplicationList } from '@/components/features/applications/application-list'
import { ApplicationFilters } from '@/components/features/applications/application-filters'
import { Skeleton } from '@/components/ui/skeleton'
import type { ApplicationStatus, Platform } from '@job-tracker/shared'

interface ApplicationsPageProps {
  searchParams: Promise<{
    q?: string
    platform?: Platform
    status?: ApplicationStatus
  }>
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

  const { data: applications, error } = await fetchApplications(supabase, {
    search: params.q,
    platform: params.platform,
    status: params.status,
  })

  if (error) {
    throw error
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">지원 현황</h2>
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
