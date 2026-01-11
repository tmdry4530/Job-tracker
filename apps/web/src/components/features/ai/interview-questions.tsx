'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { toast } from 'sonner'
import type { QuestionCategory } from '@job-tracker/shared'

interface InterviewQuestionsProps {
  applicationId: string
  hasJdContent: boolean
}

interface InterviewQuestion {
  id: string
  application_id: string
  question: string
  category: QuestionCategory | null
  created_at: string
}

const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  technical: '기술',
  experience: '경험',
  situational: '상황',
  general: '일반',
}

const CATEGORY_COLORS: Record<QuestionCategory, string> = {
  technical: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  experience: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  situational: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  general: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

export function InterviewQuestions({ applicationId, hasJdContent }: InterviewQuestionsProps) {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/ai/questions?applicationId=${applicationId}`)
      const result = await response.json()

      if (result.success) {
        setQuestions(result.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch questions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  async function generateQuestions() {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || '질문 생성에 실패했습니다')
      }

      setQuestions(result.data)
      toast.success('면접 예상 질문이 생성되었습니다')
    } catch (err) {
      const message = err instanceof Error ? err.message : '질문 생성에 실패했습니다'
      setError(message)
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  async function regenerateQuestions() {
    setIsGenerating(true)
    setError(null)

    try {
      // 기존 질문 삭제
      const deleteResponse = await fetch(`/api/ai/questions?applicationId=${applicationId}`, {
        method: 'DELETE',
      })

      if (!deleteResponse.ok) {
        const result = await deleteResponse.json()
        throw new Error(result.error?.message || '기존 질문 삭제에 실패했습니다')
      }

      // 새로 생성
      await generateQuestions()
    } catch (err) {
      const message = err instanceof Error ? err.message : '질문 재생성에 실패했습니다'
      setError(message)
      toast.error(message)
      setIsGenerating(false)
    }
  }

  // 카테고리별로 질문 그룹화
  const groupedQuestions = questions.reduce((acc, q) => {
    const category = q.category || 'general'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(q)
    return acc
  }, {} as Record<QuestionCategory, InterviewQuestion[]>)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            면접 예상 질문
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasJdContent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            면접 예상 질문
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            JD 정보가 없어 질문을 생성할 수 없습니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            면접 예상 질문
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={generateQuestions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            면접 예상 질문
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            AI가 JD를 분석하여 면접 예상 질문을 생성해드립니다.
          </p>
          <Button
            onClick={generateQuestions}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                질문 생성
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          면접 예상 질문
          <Badge variant="secondary" className="ml-2">
            {questions.length}개
          </Badge>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={regenerateQuestions}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {(Object.keys(CATEGORY_LABELS) as QuestionCategory[]).map((category) => {
            const categoryQuestions = groupedQuestions[category]
            if (!categoryQuestions || categoryQuestions.length === 0) return null

            return (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Badge className={CATEGORY_COLORS[category]}>
                      {CATEGORY_LABELS[category]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {categoryQuestions.length}개
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3">
                    {categoryQuestions.map((q, index) => (
                      <li key={q.id} className="flex gap-3">
                        <span className="text-muted-foreground font-medium shrink-0">
                          {index + 1}.
                        </span>
                        <span className="text-sm">{q.question}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </CardContent>
    </Card>
  )
}
