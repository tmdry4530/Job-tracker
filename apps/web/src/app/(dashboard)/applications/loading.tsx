import { Skeleton } from '@/components/ui/skeleton'

export default function ApplicationsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-48 flex-1" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
