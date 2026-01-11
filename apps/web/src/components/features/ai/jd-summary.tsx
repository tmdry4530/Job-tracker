'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Loader2, RefreshCw, AlertCircle, ImageIcon, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

interface JdSummaryProps {
  applicationId: string
  hasJdContent: boolean
  isImageBasedJd?: boolean
  sourceUrl?: string | null
}

interface JdSummaryData {
  id: string
  application_id: string
  summary: string
  created_at: string
}

export function JdSummary({ applicationId, hasJdContent, isImageBasedJd, sourceUrl }: JdSummaryProps) {
  const [summary, setSummary] = useState<JdSummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/ai/summarize?applicationId=${applicationId}`)
      const result = await response.json()

      if (result.success && result.data) {
        setSummary(result.data)
        return true // 기존 요약 존재
      }
      return false // 기존 요약 없음
    } catch (err) {
      console.error('Failed to fetch summary:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [applicationId])

  // JD가 있고 요약이 없으면 자동 생성
  const autoGenerateSummary = useCallback(async () => {
    if (!hasJdContent) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        setSummary(result.data)
      }
    } catch (err) {
      console.error('Failed to auto-generate summary:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [applicationId, hasJdContent])

  useEffect(() => {
    // 이미지 기반 JD면 요약 생성 안함
    if (isImageBasedJd) {
      setIsLoading(false)
      return
    }

    fetchSummary().then((hasSummary) => {
      // 기존 요약이 없고 JD가 있으면 자동 생성
      if (!hasSummary && hasJdContent) {
        autoGenerateSummary()
      }
    })
  }, [fetchSummary, hasJdContent, autoGenerateSummary, isImageBasedJd])

  async function generateSummary() {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || '요약 생성에 실패했습니다')
      }

      setSummary(result.data)
      toast.success('JD 요약이 생성되었습니다')
    } catch (err) {
      const message = err instanceof Error ? err.message : '요약 생성에 실패했습니다'
      setError(message)
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI 요약
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
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
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI 요약
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            JD 정보가 없어 요약을 생성할 수 없습니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  // 이미지 기반 JD인 경우
  if (isImageBasedJd) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-orange-500" />
            이미지 형식 공고
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            이 공고는 이미지 형식으로 작성되어 AI가 텍스트를 분석할 수 없습니다.
          </p>
          {sourceUrl && (
            <Button variant="outline" asChild>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                원본 공고에서 확인하기
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI 요약
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={generateSummary}>
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI 요약
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isGenerating ? (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">AI가 공고를 분석하고 있습니다...</span>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                AI가 JD를 분석하여 핵심 내용을 요약해드립니다.
              </p>
              <Button
                onClick={generateSummary}
                disabled={isGenerating}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                요약 생성
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  async function regenerateSummary() {
    setIsGenerating(true)
    setError(null)

    try {
      // 기존 요약 삭제 후 새로 생성
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, regenerate: true }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || '요약 생성에 실패했습니다')
      }

      setSummary(result.data)
      toast.success('요약이 새로 생성되었습니다')
    } catch (err) {
      const message = err instanceof Error ? err.message : '요약 생성에 실패했습니다'
      setError(message)
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI 요약
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={regenerateSummary}
            disabled={isGenerating}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
            다시 생성
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="
          prose prose-slate dark:prose-invert max-w-none

          [&>h2]:text-base [&>h2]:font-bold [&>h2]:mt-0 [&>h2]:mb-3
          [&>h2]:pb-2 [&>h2]:border-b [&>h2]:border-border
          [&>h2:not(:first-child)]:mt-6

          [&>p]:text-sm [&>p]:leading-relaxed [&>p]:text-muted-foreground [&>p]:mb-4

          [&>ul]:my-3 [&>ul]:space-y-2 [&>ul]:list-none [&>ul]:pl-0
          [&>ul>li]:text-sm [&>ul>li]:leading-relaxed
          [&>ul>li]:pl-5 [&>ul>li]:relative
          [&>ul>li]:before:content-['•'] [&>ul>li]:before:absolute [&>ul>li]:before:left-0
          [&>ul>li]:before:text-primary [&>ul>li]:before:font-bold

          [&>p:has(React,TypeScript,Next)]:flex [&>p:has(React,TypeScript,Next)]:flex-wrap [&>p:has(React,TypeScript,Next)]:gap-2
        ">
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="text-base font-bold mt-0 mb-3 pb-2 border-b border-border first:mt-0 [&:not(:first-child)]:mt-6">
                  {children}
                </h2>
              ),
              p: ({ children }) => {
                const text = String(children)
                // 기술 스택 섹션인 경우 태그로 표시
                if (text.includes(',') && (text.includes('React') || text.includes('TypeScript') || text.includes('Python') || text.includes('Java'))) {
                  const techs = text.split(',').map(t => t.trim()).filter(Boolean)
                  return (
                    <div className="flex flex-wrap gap-2 my-3">
                      {techs.map((tech, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )
                }
                return <p className="text-sm leading-relaxed text-muted-foreground mb-4">{children}</p>
              },
              ul: ({ children }) => (
                <ul className="my-3 space-y-2 list-none pl-0">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="text-sm leading-relaxed pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:font-medium">
                  {children}
                </li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
            }}
          >
            {summary.summary}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}
