/**
 * POST /api/applications/jd
 *
 * 익스텐션이 공고 상세 페이지에서 수집한 JD를 기존 레코드에 반영한다.
 * (platform, company_name, position)이 일치하는 행을 찾아 jd_content/source_url 갱신.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getUserIdFromRequest } from '@/lib/auth/get-user'

const JdRequestSchema = z.object({
  platform: z.enum(['wanted', 'saramin']),
  companyName: z.string(),
  position: z.string(),
  sourceUrl: z.string(),
  jdContent: z.string(),
})

export async function POST(request: NextRequest) {
  // 인증 (Bearer 토큰 우선)
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  // 요청 검증
  const body = await request.json()
  const parsed = JdRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || '입력값이 유효하지 않습니다' },
      { status: 400 }
    )
  }

  const { platform, companyName, position, sourceUrl, jdContent } = parsed.data

  // 기존 레코드 갱신
  const updated = await db
    .update(applications)
    .set({ jd_content: jdContent, source_url: sourceUrl })
    .where(
      and(
        eq(applications.user_id, userId),
        eq(applications.platform, platform),
        eq(applications.company_name, companyName),
        eq(applications.position, position)
      )
    )
    .returning({ id: applications.id })

  if (updated.length === 0) {
    return NextResponse.json({ success: false, error: '지원 기록이 없습니다' })
  }

  return NextResponse.json({ success: true })
}
