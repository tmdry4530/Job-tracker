'use client'

import { Suspense } from 'react'
import { SearchInput } from './search-input'
import { PlatformFilter } from './platform-filter'
import { StatusFilter } from './status-filter'
import { Skeleton } from '@/components/ui/skeleton'

function FiltersSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-[300px]" />
      <Skeleton className="h-10 w-[140px]" />
      <Skeleton className="h-10 w-[140px]" />
    </div>
  )
}

export function ApplicationFilters() {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Suspense fallback={<FiltersSkeleton />}>
        <SearchInput />
        <PlatformFilter />
        <StatusFilter />
      </Suspense>
    </div>
  )
}
