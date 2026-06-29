'use client'

import { Suspense } from 'react'
import { SearchInput } from './search-input'
import { PlatformFilter } from './platform-filter'
import { Skeleton } from '@/components/ui/skeleton'

function FiltersSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
      <Skeleton className="h-10 w-full sm:w-[300px]" />
      <Skeleton className="h-10 w-[140px]" />
    </div>
  )
}

export function ApplicationFilters() {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
      <Suspense fallback={<FiltersSkeleton />}>
        <div className="w-full sm:w-auto sm:flex-1 sm:max-w-[300px]">
          <SearchInput />
        </div>
        <PlatformFilter />
      </Suspense>
    </div>
  )
}
