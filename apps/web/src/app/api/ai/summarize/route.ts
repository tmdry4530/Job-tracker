import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  sendMessage,
  JD_SUMMARY_SYSTEM_PROMPT,
  createJdSummaryUserPrompt,
} from '@/lib/claude'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'

const SummarizeRequestSchema = z.object({
  applicationId: z.string().uuid('유효하지 않은 ID입니다'),
  regenerate: z.boolean().optional(),
})

const ApplicationIdSchema = z.string().uuid('유효하지 않은 ID입니다')

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 }
      )
    }

    // Rate limiting 체크
    const rateLimitResult = checkRateLimit(
      `summarize:${user.id}`,
      RATE_LIMITS.AI_SUMMARIZE
    )
    if (!rateLimitResult.success) {
      const errorResponse = createRateLimitResponse(rateLimitResult)
      return NextResponse.json(errorResponse.body, {
        status: errorResponse.status,
        headers: errorResponse.headers,
      })
    }

    // 요청 검증
    const body = await request.json()
    const parsed = SummarizeRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message || '입력값이 유효하지 않습니다' } },
        { status: 400 }
      )
    }

    const { applicationId, regenerate } = parsed.data

    // regenerate가 true면 기존 요약 삭제
    if (regenerate) {
      await supabase
        .from('jd_summaries')
        .delete()
        .eq('application_id', applicationId)
        .eq('user_id', user.id)
    } else {
      // 기존 요약 확인 (캐시)
      const { data: existingSummary } = await supabase
        .from('jd_summaries')
        .select('*')
        .eq('application_id', applicationId)
        .eq('user_id', user.id)
        .single()

      if (existingSummary) {
        return NextResponse.json({
          success: true,
          data: existingSummary,
          cached: true,
        })
      }
    }

    // Application 조회
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '지원 내역을 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    if (!application.jd_content) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'JD 내용이 없습니다' } },
        { status: 400 }
      )
    }

    // Claude API 호출
    let summary: string
    try {
      const userPrompt = createJdSummaryUserPrompt(
        application.jd_content,
        application.company_name,
        application.position
      )

      summary = await sendMessage(JD_SUMMARY_SYSTEM_PROMPT, userPrompt, {
        maxTokens: 2048,
        temperature: 0.5,
      })
    } catch (claudeError) {
      console.error('Claude API error:', claudeError)
      return NextResponse.json(
        { success: false, error: { code: 'AI_SERVICE_UNAVAILABLE', message: 'AI 서비스를 일시적으로 사용할 수 없습니다' } },
        { status: 503 }
      )
    }

    // 요약 저장
    const { data: savedSummary, error: saveError } = await supabase
      .from('jd_summaries')
      .insert({
        application_id: applicationId,
        user_id: user.id,
        summary,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Save error:', saveError)
      // 저장 실패해도 요약은 반환
      return NextResponse.json({
        success: true,
        data: { summary, application_id: applicationId },
        cached: false,
      })
    }

    return NextResponse.json({
      success: true,
      data: savedSummary,
      cached: false,
    })

  } catch (error) {
    console.error('Summarize API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}

// GET: 기존 요약 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('applicationId')

    const parsed = ApplicationIdSchema.safeParse(applicationId)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message || 'applicationId가 유효하지 않습니다' } },
        { status: 400 }
      )
    }

    const { data: summary, error } = await supabase
      .from('jd_summaries')
      .select('*')
      .eq('application_id', applicationId)
      .eq('user_id', user.id)
      .single()

    if (error || !summary) {
      return NextResponse.json({
        success: true,
        data: null,
      })
    }

    return NextResponse.json({
      success: true,
      data: summary,
    })

  } catch (error) {
    console.error('Get summary error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
