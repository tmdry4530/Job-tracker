'use client'

import Link from 'next/link'
import { KeyRound, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * AI API 키 미설정 시 표시하는 인라인 안내.
 * API 응답 error.code === 'LLM_KEY_NOT_SET'일 때 렌더링한다.
 */
export function LlmKeyNotice() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-2">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          AI 기능을 쓰려면 설정에서 API 키를 입력하세요.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/settings" className="flex items-center gap-1.5">
          설정으로 이동
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

/** API 응답에서 LLM 키 미설정 에러 코드인지 판별 */
export const LLM_KEY_NOT_SET_CODE = 'LLM_KEY_NOT_SET'
