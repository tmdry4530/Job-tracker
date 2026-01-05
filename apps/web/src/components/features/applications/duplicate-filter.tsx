'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function DuplicateFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const showDuplicates = searchParams.get('duplicates') === 'true'

  function handleClick() {
    const params = new URLSearchParams(searchParams.toString())

    if (showDuplicates) {
      params.delete('duplicates')
    } else {
      params.set('duplicates', 'true')
    }

    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }

  return (
    <Button
      variant={showDuplicates ? 'default' : 'outline'}
      size="sm"
      onClick={handleClick}
    >
      중복 지원만
    </Button>
  )
}
