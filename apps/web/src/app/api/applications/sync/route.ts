/**
 * POST /api/applications/sync
 *
 * 익스텐션이 수집한 북마크/스크랩 공고를 Bearer 토큰으로 동기화한다.
 * - (user_id, source_url) 기준 upsert
 * - 기존 jd_content는 coalesce로 절대 덮어쓰지 않음
 * - 무료 플랜 100건 제한 트리거는 항목별 try/catch로 처리
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getUserIdFromRequest } from '@/lib/auth/get-user'

const BookmarkSchema = z.object({
  platform: z.enum(['wanted', 'saramin', 'jobkorea']),
  companyName: z.string(),
  position: z.string(),
  sourceUrl: z.string(),
  savedAt: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  jdContent: z.string().nullable().optional(),
})

const SyncRequestSchema = z.object({
  bookmarks: z.array(BookmarkSchema),
})

export async function POST(request: NextRequest) {
  // 인증 (Bearer 토큰 우선)
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  // 요청 검증
  const body = await request.json()
  const parsed = SyncRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || '입력값이 유효하지 않습니다' },
      { status: 400 }
    )
  }

  // source_url 기준 중복 제거
  const seen = new Set<string>()
  const uniqueBookmarks = parsed.data.bookmarks.filter((b) => {
    if (seen.has(b.sourceUrl)) return false
    seen.add(b.sourceUrl)
    return true
  })

  let syncedCount = 0
  let skippedCount = 0

  for (const b of uniqueBookmarks) {
    try {
      // user_id는 항상 인증 정보에서, body 값은 무시
      await db
        .insert(applications)
        .values({
          user_id: userId,
          platform: b.platform,
          company_name: b.companyName,
          position: b.position,
          source_url: b.sourceUrl,
          status: 'saved',
          saved_at: b.savedAt ?? null,
          deadline: b.deadline ?? null,
          jd_content: b.jdContent ?? null,
        })
        .onConflictDoUpdate({
          target: [applications.user_id, applications.source_url],
          set: {
            position: b.position,
            // 기존 JD가 있으면 유지, 없을 때만 새 값으로 채움
            jd_content: sql`coalesce(${applications.jd_content}, excluded.jd_content)`,
            ...(b.savedAt != null ? { saved_at: b.savedAt } : {}),
            ...(b.deadline != null ? { deadline: b.deadline } : {}),
          },
        })

      syncedCount++
    } catch (error) {
      // 무료 플랜 제한 트리거 등으로 실패한 항목은 스킵
      console.error('[Sync API] Item error:', error)
      skippedCount++
    }
  }

  return NextResponse.json({ syncedCount, skippedCount })
}
