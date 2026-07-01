'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MessageSquare, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { PlatformBadge } from './platform-badge'
import { EmptyState } from './empty-state'
import { BookmarkButton } from './bookmark-button'
import { ApplicationCard } from './application-card'
import { DeadlineBadge } from './deadline-badge'
import { DeleteDialog } from './delete-dialog'
import { deleteApplications } from '@/app/(dashboard)/applications/actions'
import type { Application } from '@job-tracker/shared'

interface ApplicationListProps {
  applications: Application[]
}

export function ApplicationList({ applications }: ApplicationListProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)

  const allSelected = selected.size === applications.length && selected.size > 0
  const someSelected = selected.size > 0 && selected.size < applications.length

  const headerCheckedState = useMemo<boolean | 'indeterminate'>(() => {
    if (allSelected) return true
    if (someSelected) return 'indeterminate'
    return false
  }, [allSelected, someSelected])

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === applications.length) {
        return new Set()
      }
      return new Set(applications.map((application) => application.id))
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  function handleBulkDelete() {
    startTransition(async () => {
      const ids = [...selected]
      const result = await deleteApplications(ids)

      if (!result.success) {
        toast.error(result.error || '삭제에 실패했습니다')
        return
      }

      toast.success(`${result.deleted ?? ids.length}건이 삭제되었습니다`)
      setDialogOpen(false)
      clearSelection()
      router.refresh()
    })
  }

  if (applications.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-3">
      {/* 일괄 작업 툴바 */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2">
          <span className="text-sm font-medium">{selected.size}개 선택됨</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection} disabled={isPending}>
              선택 해제
            </Button>
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isPending}>
                  <Trash2 className="h-4 w-4" />
                  선택 삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    선택한 {selected.size}건을 삭제하시겠습니까?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    disabled={isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isPending ? '삭제 중...' : '삭제'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* 모바일: 카드 뷰 */}
      <div className="space-y-3 md:hidden">
        {/* 모바일 전체 선택 컨트롤 */}
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={headerCheckedState}
            onCheckedChange={toggleAll}
            aria-label="전체 선택"
          />
          <span className="text-sm text-muted-foreground">
            {allSelected ? '전체 해제' : '전체 선택'}
          </span>
        </div>
        {applications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            isSelected={selected.has(application.id)}
            onToggleSelect={toggleOne}
          />
        ))}
      </div>

      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={headerCheckedState}
                  onCheckedChange={toggleAll}
                  aria-label="전체 선택"
                />
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[100px]">플랫폼</TableHead>
              <TableHead>회사명</TableHead>
              <TableHead>포지션</TableHead>
              <TableHead className="w-[100px]">마감일</TableHead>
              <TableHead className="w-[50px]"><span className="sr-only">작업</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Checkbox
                    checked={selected.has(application.id)}
                    onCheckedChange={() => toggleOne(application.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`${application.company_name} 선택`}
                  />
                </TableCell>
                <TableCell className="pr-0">
                  <div className="flex items-center gap-1">
                    <BookmarkButton
                      applicationId={application.id}
                      isBookmarked={application.is_favorite}
                      size="sm"
                    />
                    {application.memo && (
                      <MessageSquare className="h-4 w-4 text-muted-foreground" aria-label="메모 있음" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <PlatformBadge platform={application.platform} />
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/applications/${application.id}`}
                    className="hover:underline"
                  >
                    {application.company_name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {application.position}
                </TableCell>
                <TableCell>
                  <DeadlineBadge deadline={application.deadline} />
                </TableCell>
                <TableCell className="pl-0 text-right">
                  <DeleteDialog applicationId={application.id} redirect={false} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
