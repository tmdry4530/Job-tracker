import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, jdSummaries } from '@/lib/db/schema'
import { getUserIdFromRequest } from '@/lib/auth/get-user'
import {
  sendMessage,
  JD_SUMMARY_SYSTEM_PROMPT,
  createJdSummaryUserPrompt,
} from '@/lib/claude'

/** 배치 처리 최대 개수 */
const MAX_BATCH_SIZE = 10

/** 요청 간 딜레이 (ms) - Rate limit 방지 */
const REQUEST_DELAY_MS = 500

/**
 * POST: 요약이 없는 모든 애플리케이션에 대해 배치 요약 생성
 * - jd_content가 있지만 jd_summary가 없는 애플리케이션 대상
 * - 최대 MAX_BATCH_SIZE개까지 처리
 * - Bearer 토큰(익스텐션) 또는 쿠키 세션(웹) 인증 지원
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (Bearer 토큰 우선, 없으면 쿠키 세션)
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 }
      )
    }

    // jd_content가 있지만 요약이 없는 애플리케이션 조회 (사용자 격리)
    let targets: { id: string; company_name: string; position: string; jd_content: string | null }[]
    try {
      targets = await db
        .select({
          id: applications.id,
          company_name: applications.company_name,
          position: applications.position,
          jd_content: applications.jd_content,
        })
        .from(applications)
        .leftJoin(jdSummaries, eq(jdSummaries.application_id, applications.id))
        .where(
          and(
            eq(applications.user_id, userId),
            isNotNull(applications.jd_content),
            isNull(jdSummaries.id)
          )
        )
        .limit(MAX_BATCH_SIZE)
    } catch (fetchError) {
      console.error('Fetch applications error:', fetchError)
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: '데이터 조회 실패' } },
        { status: 500 }
      )
    }

    if (targets.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          processed: 0,
          failed: 0,
          message: '요약할 애플리케이션이 없습니다',
        },
      })
    }

    console.log(`[Batch Summarize] Processing ${targets.length} applications for user ${userId}`)

    let processed = 0
    let failed = 0

    for (let i = 0; i < targets.length; i++) {
      const app = targets[i]
      const jdContent = app.jd_content
      if (!jdContent) {
        continue
      }

      try {
        // Claude API 호출
        const userPrompt = createJdSummaryUserPrompt(
          jdContent,
          app.company_name,
          app.position
        )

        const summary = await sendMessage(JD_SUMMARY_SYSTEM_PROMPT, userPrompt, {
          maxTokens: 2048,
          temperature: 0.5,
        })

        // 요약 저장 (user_id는 인증 정보에서)
        try {
          await db.insert(jdSummaries).values({
            application_id: app.id,
            user_id: userId,
            summary,
          })

          processed++
          console.log(`[Batch Summarize] Summarized: ${app.company_name} - ${app.position}`)
        } catch (saveError) {
          console.error(`[Batch Summarize] Save error for ${app.id}:`, saveError)
          failed++
        }

        // Rate limit 방지를 위한 딜레이
        if (i < targets.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS))
        }
      } catch (error) {
        console.error(`[Batch Summarize] Error for ${app.id}:`, error)
        failed++
      }
    }

    console.log(`[Batch Summarize] Completed: ${processed} processed, ${failed} failed`)

    return NextResponse.json({
      success: true,
      data: {
        processed,
        failed,
        total: targets.length,
      },
    })

  } catch (error) {
    console.error('Batch summarize API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
