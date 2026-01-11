/**
 * 구독 취소 API
 * POST /api/payment/cancel
 *
 * 구독을 취소하고 다음 결제 주기부터 적용
 * (현재 결제 주기는 유지)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteBillingKey } from '@/lib/toss'
import { fetchSubscription, cancelSubscription } from '@/lib/queries/subscription'
import { envHelpers } from '@/lib/env'

export async function POST() {
  try {
    // 토스페이먼츠 설정 확인
    if (!envHelpers.toss.isConfigured) {
      return NextResponse.json(
        { error: '결제 시스템이 설정되지 않았습니다.' },
        { status: 503 }
      )
    }

    const supabase = await createClient()

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 현재 구독 조회
    const subscriptionResult = await fetchSubscription(supabase, user.id)

    if (!subscriptionResult.data) {
      return NextResponse.json(
        { error: '활성 구독이 없습니다.' },
        { status: 404 }
      )
    }

    const subscription = subscriptionResult.data

    if (subscription.status !== 'active') {
      return NextResponse.json(
        { error: '이미 취소된 구독입니다.' },
        { status: 400 }
      )
    }

    // 토스페이먼츠 빌링키 삭제
    const deleteResult = await deleteBillingKey(
      subscription.billing_key,
      subscription.customer_key
    )

    if (!deleteResult.success) {
      console.error('Failed to delete billing key:', deleteResult.error)
      // 빌링키 삭제 실패해도 DB에서는 취소 처리
    }

    // 구독 취소 처리
    const cancelResult = await cancelSubscription(supabase, subscription.id)

    if (cancelResult.error) {
      return NextResponse.json(
        { error: '구독 취소에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '구독이 취소되었습니다. 현재 결제 주기가 끝나면 Free 플랜으로 전환됩니다.',
      expires_at: subscription.current_period_end,
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: '구독 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
