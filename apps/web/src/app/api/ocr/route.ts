import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'

const OcrRequestSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1, '이미지 URL이 필요합니다'),
})

/**
 * Authorization 헤더 또는 쿠키로 인증
 */
async function getAuthenticatedUser(request: NextRequest) {
  // 먼저 Authorization 헤더 확인 (익스텐션에서 호출 시)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (!error && user) {
      return { user, supabase }
    }
  }

  // 쿠키 기반 인증 (웹에서 호출 시)
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!error && user) {
    return { user, supabase }
  }

  return null
}

interface ClovaOcrField {
  inferText: string
  inferConfidence: number
}

interface ClovaOcrImage {
  fields: ClovaOcrField[]
}

interface ClovaOcrResponse {
  images: ClovaOcrImage[]
}

/**
 * 이미지 URL에서 base64 데이터 가져오기
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; format: string } | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error('[OCR API] Failed to fetch image:', response.status)
      return null
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // 포맷 추출
    let format = 'png'
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      format = 'jpg'
    } else if (contentType.includes('png')) {
      format = 'png'
    } else if (contentType.includes('gif')) {
      format = 'gif'
    }

    return { data: base64, format }
  } catch (error) {
    console.error('[OCR API] Error fetching image:', error)
    return null
  }
}

/**
 * CLOVA OCR API 호출
 */
async function callClovaOcr(imageUrl: string): Promise<string> {
  const ocrUrl = process.env.CLOVA_OCR_URL
  const ocrSecret = process.env.CLOVA_OCR_SECRET

  if (!ocrUrl || !ocrSecret) {
    throw new Error('CLOVA OCR 설정이 없습니다')
  }

  console.log('[OCR API] Fetching image:', imageUrl)

  // 이미지를 다운로드해서 base64로 변환
  const imageData = await fetchImageAsBase64(imageUrl)
  if (!imageData) {
    throw new Error('이미지 다운로드 실패')
  }

  console.log('[OCR API] Image fetched, format:', imageData.format, 'size:', imageData.data.length)

  const requestBody = {
    version: 'V2',
    requestId: uuidv4(),
    timestamp: Date.now(),
    images: [
      {
        format: imageData.format,
        data: imageData.data,
        name: 'jd_image',
      },
    ],
  }

  const response = await fetch(ocrUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OCR-SECRET': ocrSecret,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[OCR API] CLOVA OCR error:', response.status, errorText)
    throw new Error(`CLOVA OCR 요청 실패: ${response.status} - ${errorText}`)
  }

  const result: ClovaOcrResponse = await response.json()

  // 모든 필드의 텍스트 추출
  const texts: string[] = []
  for (const image of result.images) {
    if (image.fields) {
      for (const field of image.fields) {
        if (field.inferText) {
          texts.push(field.inferText)
        }
      }
    }
  }

  return texts.join(' ')
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (Authorization 헤더 또는 쿠키)
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 }
      )
    }

    // Rate limiting 체크
    const rateLimitResult = checkRateLimit(
      `ocr:${auth.user.id}`,
      RATE_LIMITS.OCR
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
    const parsed = OcrRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message || '입력값이 유효하지 않습니다' } },
        { status: 400 }
      )
    }

    const { imageUrls } = parsed.data

    // 각 이미지에 대해 OCR 실행
    const ocrResults: string[] = []
    for (const imageUrl of imageUrls) {
      try {
        const text = await callClovaOcr(imageUrl)
        if (text.trim()) {
          ocrResults.push(text)
        }
      } catch (error) {
        console.error(`[OCR API] Failed to process image: ${imageUrl}`, error)
        // 개별 이미지 실패는 무시하고 계속 진행
      }
    }

    if (ocrResults.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'OCR_FAILED', message: '이미지에서 텍스트를 추출할 수 없습니다' } },
        { status: 400 }
      )
    }

    const combinedText = ocrResults.join('\n\n')

    return NextResponse.json({
      success: true,
      data: {
        text: combinedText,
        imageCount: imageUrls.length,
        processedCount: ocrResults.length,
      },
    })

  } catch (error) {
    console.error('[OCR API] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
