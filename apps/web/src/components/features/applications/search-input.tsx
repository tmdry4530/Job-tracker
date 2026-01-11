'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'

export function SearchInput() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('q') || ''

  const [inputValue, setInputValue] = useState(initialSearch)
  const debouncedSearch = useDebounce(inputValue, 500)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (debouncedSearch) {
      params.set('q', debouncedSearch)
    } else {
      params.delete('q')
    }

    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }, [debouncedSearch, pathname, router, searchParams])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="회사명 또는 포지션 검색..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="pl-9 w-[300px]"
      />
    </div>
  )
}
