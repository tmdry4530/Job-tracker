import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
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
 * Bearer 토큰으로 Supabase 클라이언트 생성
 */
function createClientWithToken(accessToken: string) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  )
}

/**
 * POST: 요약이 없는 모든 애플리케이션에 대해 배치 요약 생성
 * - jd_content가 있지만 jd_summary가 없는 애플리케이션 대상
 * - 최대 MAX_BATCH_SIZE개까지 처리
 * - Cookie 또는 Bearer 토큰 인증 지원
 */
export async function POST(request: NextRequest) {
  try {
    // Bearer 토큰 확인
    const authHeader = request.headers.get('Authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    // Supabase 클라이언트 생성 (Bearer 토큰 우선, 없으면 Cookie)
    const supabase = bearerToken
      ? createClientWithToken(bearerToken)
      : await createClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 }
      )
    }

    // jd_content가 있지만 요약이 없는 애플리케이션 조회
    const { data: applications, error: fetchError } = await supabase
      .from('applications')
      .select(`
        id,
        company_name,
        position,
        jd_content,
        jd_summaries (id)
      `)
      .eq('user_id', user.id)
      .not('jd_content', 'is', null)
      .is('jd_summaries', null)
      .limit(MAX_BATCH_SIZE)

    if (fetchError) {
      console.error('Fetch applications error:', fetchError)
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: '데이터 조회 실패' } },
        { status: 500 }
      )
    }

    if (!applications || applications.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          processed: 0,
          failed: 0,
          message: '요약할 애플리케이션이 없습니다',
        },
      })
    }

    console.log(`[Batch Summarize] Processing ${applications.length} applications for user ${user.id}`)

    let processed = 0
    let failed = 0

    for (const app of applications) {
      try {
        // Claude API 호출
        const userPrompt = createJdSummaryUserPrompt(
          app.jd_content!,
          app.company_name,
          app.position
        )

        const summary = await sendMessage(JD_SUMMARY_SYSTEM_PROMPT, userPrompt, {
          maxTokens: 2048,
          temperature: 0.5,
        })

        // 요약 저장
        const { error: saveError } = await supabase
          .from('jd_summaries')
          .insert({
            application_id: app.id,
            user_id: user.id,
            summary,
          })

        if (saveError) {
          console.error(`[Batch Summarize] Save error for ${app.id}:`, saveError)
          failed++
        } else {
          processed++
          console.log(`[Batch Summarize] Summarized: ${app.company_name} - ${app.position}`)
        }

        // Rate limit 방지를 위한 딜레이
        if (applications.indexOf(app) < applications.length - 1) {
          await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS))
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
        total: applications.length,
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
