'use client'

import { useState, useTransition } from 'react'
import { Pencil, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateMemo } from '@/app/(dashboard)/applications/actions'

interface MemoEditorProps {
  applicationId: string
  initialMemo: string | null
}

export function MemoEditor({ applicationId, initialMemo }: MemoEditorProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [memo, setMemo] = useState(initialMemo || '')
  const [savedMemo, setSavedMemo] = useState(initialMemo)

  const handleSave = () => {
    const memoToSave = memo.trim() || null

    startTransition(async () => {
      const result = await updateMemo(applicationId, memoToSave)
      if (result.success) {
        setSavedMemo(memoToSave)
        setIsEditing(false)
      }
    })
  }

  const handleCancel = () => {
    setMemo(savedMemo || '')
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <div className="group">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {savedMemo ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {savedMemo}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">
                메모가 없습니다
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsEditing(true)}
            aria-label="메모 편집"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모를 입력하세요..."
        className="w-full min-h-[100px] p-3 text-sm border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        maxLength={2000}
        autoFocus
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {memo.length}/2000
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-1" />
            취소
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            {isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  )
}
