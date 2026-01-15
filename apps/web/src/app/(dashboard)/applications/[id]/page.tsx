import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fetchApplicationById } from '@/lib/queries/applications'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusDropdown } from '@/components/features/applications/status-dropdown'
import { PlatformBadge } from '@/components/features/applications/platform-badge'
import { DeleteDialog } from '@/components/features/applications/delete-dialog'
import { BookmarkButton } from '@/components/features/applications/bookmark-button'
import { MemoEditor } from '@/components/features/applications/memo-editor'
import { JdSummary, InterviewQuestions } from '@/components/features/ai'
import { formatDate } from '@job-tracker/shared'

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: application, error } = await fetchApplicationById(supabase, id)

  if (error || !application) {
    notFound()
  }

  const hasJdContent = Boolean(application.jd_content)
  const isImageBasedJd = application.jd_content === '[이미지 형식 공고]'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/applications">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{application.company_name}</h1>
            <PlatformBadge platform={application.platform} />
          </div>
          <p className="text-lg text-muted-foreground">{application.position}</p>
        </div>
        <div className="flex items-center gap-2">
          <BookmarkButton
            applicationId={application.id}
            isBookmarked={application.is_favorite}
          />
          <StatusDropdown
            applicationId={application.id}
            currentStatus={application.status}
          />
          <DeleteDialog applicationId={application.id} />
        </div>
      </div>

      {/* 공고 정보 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>공고 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">저장일</p>
            <p>{application.saved_at ? formatDate(application.saved_at) : '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">등록일</p>
            <p>{formatDate(application.created_at)}</p>
          </div>
          {application.source_url && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">원본 공고</p>
              <Button variant="link" className="p-0 h-auto" asChild>
                <a
                  href={application.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  공고 보기
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 메모 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>메모</CardTitle>
        </CardHeader>
        <CardContent>
          <MemoEditor
            applicationId={application.id}
            initialMemo={application.memo}
          />
        </CardContent>
      </Card>

      {/* AI 분석 탭 */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">AI 요약</TabsTrigger>
          <TabsTrigger value="questions">면접 준비</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <JdSummary
            applicationId={application.id}
            hasJdContent={hasJdContent}
            isImageBasedJd={isImageBasedJd}
            sourceUrl={application.source_url}
          />
        </TabsContent>

        <TabsContent value="questions" className="mt-4">
          <InterviewQuestions
            applicationId={application.id}
            hasJdContent={hasJdContent}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
