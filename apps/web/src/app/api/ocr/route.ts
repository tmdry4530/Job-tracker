import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { getUserIdFromRequest } from '@/lib/auth/get-user'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'

// dns 모듈 사용 + SSRF 방어를 위해 node 런타임 강제 (edge 불가)
export const runtime = 'nodejs'

// https + 개수 상한으로 SSRF 표면 축소
const OcrRequestSchema = z.object({
  imageUrls: z
    .array(
      z
        .string()
        .url()
        .refine((u) => {
          try {
            return new URL(u).protocol === 'https:'
          } catch {
            return false
          }
        }, 'https URL만 허용됩니다')
    )
    .min(1, '이미지 URL이 필요합니다')
    .max(10, '한 번에 최대 10개의 이미지만 처리할 수 있습니다'),
})

// 이미지 fetch 안전 한도
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB
const FETCH_TIMEOUT_MS = 10_000 // 10초

/** SSRF 거부를 식별하기 위한 전용 에러 타입 */
class SsrfError extends Error {}

/** 사설/루프백/링크로컬 IPv4 대역 판별 */
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return true // 파싱 불가 → 안전하지 않은 것으로 취급
  }
  const [a, b] = parts
  if (a === 0) return true // 0.0.0.0/8
  if (a === 10) return true // 10.0.0.0/8
  if (a === 127) return true // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true // 169.254.0.0/16 (link-local)
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 (CGNAT)
  return false
}

/** 사설/루프백/링크로컬 IP(IPv4/IPv6) 판별 */
function isPrivateIp(ip: string): boolean {
  const family = isIP(ip)
  if (family === 4) return isPrivateIpv4(ip)
  if (family === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::1' || lower === '::') return true // loopback / unspecified
    // IPv4-mapped: 점10진(::ffff:127.0.0.1)·16진(::ffff:7f00:1) 두 표기 모두 처리
    const mappedDotted = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
    if (mappedDotted) return isPrivateIpv4(mappedDotted[1])
    const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
    if (mappedHex) {
      const hi = parseInt(mappedHex[1], 16)
      const lo = parseInt(mappedHex[2], 16)
      return isPrivateIpv4(
        `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`
      )
    }
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true // fc00::/7 (ULA)
    if (/^fe[89ab]/.test(lower)) return true // fe80::/10 (link-local)
    return false
  }
  return true // 알 수 없는 형식 → 거부
}

/**
 * URL이 외부로 안전한지 검증: https 강제 + DNS resolve 결과가
 * 사설/루프백/링크로컬 대역이면 거부 (SSRF 방어)
 */
async function assertSafeUrl(imageUrl: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(imageUrl)
  } catch {
    throw new SsrfError('잘못된 이미지 URL입니다')
  }
  if (parsed.protocol !== 'https:') {
    throw new SsrfError('https URL만 허용됩니다')
  }
  const records = await lookup(parsed.hostname, { all: true })
  if (records.length === 0) {
    throw new SsrfError('호스트를 확인할 수 없습니다')
  }
  for (const { address } of records) {
    if (isPrivateIp(address)) {
      throw new SsrfError('허용되지 않은 대상 주소입니다')
    }
  }
}

/** 응답 본문을 바이트 상한을 적용해 읽기 (대용량 다운로드 차단) */
async function readBodyWithCap(response: Response, maxBytes: number): Promise<Buffer> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('응답 본문이 없습니다')
  }
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new Error('이미지 크기가 허용 한도를 초과했습니다')
      }
      chunks.push(value)
    }
  }
  return Buffer.concat(chunks)
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
    // (a) DNS resolve 기반 사설/루프백 대역 차단 (rebinding 대비 defense-in-depth)
    await assertSafeUrl(imageUrl)

    // (b) 10초 타임아웃
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(imageUrl, {
        signal: controller.signal,
        redirect: 'manual', // (c) 리다이렉트 추종 금지 (내부망 우회 차단)
      })
    } finally {
      clearTimeout(timeout)
    }

    // redirect:'manual' → 3xx(또는 opaqueredirect status 0)는 추종하지 않고 거부
    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
      console.error('[OCR API] Redirect blocked:', response.status)
      return null
    }
    if (!response.ok) {
      console.error('[OCR API] Failed to fetch image:', response.status)
      return null
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    // (d) 응답 바이트 상한(10MB) 적용
    const buffer = await readBodyWithCap(response, MAX_IMAGE_BYTES)
    const base64 = buffer.toString('base64')

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
    requestId: crypto.randomUUID(),
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
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 }
      )
    }

    // Rate limiting 체크
    const rateLimitResult = checkRateLimit(
      `ocr:${userId}`,
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

    // SSRF 사전 검증: 사설/루프백/링크로컬 대역을 가리키는 URL은 즉시 거부
    for (const imageUrl of imageUrls) {
      try {
        await assertSafeUrl(imageUrl)
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_IMAGE_URL',
              message: error instanceof SsrfError ? error.message : '허용되지 않은 이미지 URL입니다',
            },
          },
          { status: 400 }
        )
      }
    }

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
