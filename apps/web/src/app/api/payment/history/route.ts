/**
 * 결제 내역 조회 API
 * GET /api/payment/history
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/get-user'
import { fetchPaymentHistory } from '@/lib/queries/subscription'

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const userId = await getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 쿼리 파라미터에서 limit 가져오기
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const result = await fetchPaymentHistory(userId, limit)

    if (result.error) {
      return NextResponse.json(
        { error: '결제 내역을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      history: result.data,
    })
  } catch (error) {
    console.error('Payment history error:', error)
    return NextResponse.json(
      { error: '결제 내역 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
