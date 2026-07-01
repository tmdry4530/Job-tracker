import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, interviewQuestions } from '@/lib/db/schema'
import { getUserIdFromRequest } from '@/lib/auth/get-user'
import {
  sendMessage,
  INTERVIEW_QUESTIONS_SYSTEM_PROMPT,
  createInterviewQuestionsUserPrompt,
} from '@/lib/llm'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import type { QuestionCategory } from '@job-tracker/shared'

const QuestionsRequestSchema = z.object({
  applicationId: z.string().uuid('유효하지 않은 ID입니다'),
})

const ApplicationIdSchema = z.string().uuid('유효하지 않은 ID입니다')

interface GeneratedQuestion {
  question: string
  answer: string
  category: QuestionCategory
}

function parseQuestionsResponse(response: string): GeneratedQuestion[] {
  try {
    // JSON 배열만 추출 (앞뒤 텍스트 제거)
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('JSON array not found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array')
    }

    return parsed.filter((item): item is GeneratedQuestion => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.question === 'string' &&
        typeof item.answer === 'string' &&
        ['technical', 'experience', 'situational', 'general'].includes(item.category)
      )
    })
  } catch (error) {
    console.error('Failed to parse questions response:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 }
      )
    }

    // Rate limiting 체크
    const rateLimitResult = checkRateLimit(
      `questions:${userId}`,
      RATE_LIMITS.AI_QUESTIONS
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
    const parsed = QuestionsRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message || '입력값이 유효하지 않습니다' } },
        { status: 400 }
      )
    }

    const { applicationId } = parsed.data

    // 기존 질문 확인 (캐시)
    const existingQuestions = await db
      .select()
      .from(interviewQuestions)
      .where(
        and(
          eq(interviewQuestions.application_id, applicationId),
          eq(interviewQuestions.user_id, userId)
        )
      )
      .orderBy(asc(interviewQuestions.created_at))

    if (existingQuestions.length > 0) {
      return NextResponse.json({
        success: true,
        data: existingQuestions,
        cached: true,
      })
    }

    // Application 조회
    const [application] = await db
      .select()
      .from(applications)
      .where(
        and(eq(applications.id, applicationId), eq(applications.user_id, userId))
      )
      .limit(1)

    if (!application) {
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
    let questions: GeneratedQuestion[]
    try {
      const userPrompt = createInterviewQuestionsUserPrompt(
        application.jd_content,
        application.company_name,
        application.position
      )

      const response = await sendMessage(INTERVIEW_QUESTIONS_SYSTEM_PROMPT, userPrompt, {
        maxTokens: 2048,
        temperature: 0.7,
      })

      questions = parseQuestionsResponse(response)

      if (questions.length === 0) {
        throw new Error('No valid questions generated')
      }
    } catch (claudeError) {
      console.error('Claude API error:', claudeError)
      return NextResponse.json(
        { success: false, error: { code: 'AI_SERVICE_UNAVAILABLE', message: 'AI 서비스를 일시적으로 사용할 수 없습니다' } },
        { status: 503 }
      )
    }

    // 질문 저장 (모범 답변 포함)
    const questionsToInsert = questions.map((q) => ({
      application_id: applicationId,
      user_id: userId,
      question: q.question,
      answer: q.answer,
      category: q.category,
    }))

    try {
      const savedQuestions = await db
        .insert(interviewQuestions)
        .values(questionsToInsert)
        .returning()

      return NextResponse.json({
        success: true,
        data: savedQuestions,
        cached: false,
      })
    } catch (saveError) {
      console.error('Save error:', saveError)
      return NextResponse.json(
        { success: false, error: { code: 'SAVE_ERROR', message: '질문 저장에 실패했습니다. 다시 시도해주세요.' } },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Questions API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}

// GET: 기존 질문 조회
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
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

    const questions = await db
      .select()
      .from(interviewQuestions)
      .where(
        and(
          eq(interviewQuestions.application_id, parsed.data),
          eq(interviewQuestions.user_id, userId)
        )
      )
      .orderBy(asc(interviewQuestions.created_at))

    return NextResponse.json({
      success: true,
      data: questions,
    })

  } catch (error) {
    console.error('Get questions error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}

// DELETE: 질문 삭제 (재생성용)
export async function DELETE(request: NextRequest) {
  try {
    // 인증 확인
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
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

    await db
      .delete(interviewQuestions)
      .where(
        and(
          eq(interviewQuestions.application_id, parsed.data),
          eq(interviewQuestions.user_id, userId)
        )
      )

    return NextResponse.json({
      success: true,
    })

  } catch (error) {
    console.error('Delete questions error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
