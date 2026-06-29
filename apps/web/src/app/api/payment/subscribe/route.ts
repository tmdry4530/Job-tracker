/**
 * 구독 생성 API
 * POST /api/payment/subscribe
 *
 * 빌링키 발급 후 첫 결제 및 구독 생성
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/get-user'
import { issueBillingKey, chargeBillingKey } from '@/lib/toss'
import {
  createSubscription,
  createPaymentHistory,
} from '@/lib/queries/subscription'
import { PREMIUM_PRICE } from '@job-tracker/shared'
import { envHelpers } from '@/lib/env'

export async function POST(request: NextRequest) {
  try {
    // 토스페이먼츠 설정 확인
    if (!envHelpers.toss.isConfigured) {
      return NextResponse.json(
        { error: '결제 시스템이 설정되지 않았습니다.' },
        { status: 503 }
      )
    }

    // 인증 확인
    const userId = await getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { authKey, customerKey } = body

    if (!authKey || !customerKey) {
      return NextResponse.json(
        { error: 'authKey와 customerKey가 필요합니다.' },
        { status: 400 }
      )
    }

    // customerKey 검증 (사용자 ID와 일치해야 함)
    if (customerKey !== userId) {
      return NextResponse.json(
        { error: '잘못된 customerKey입니다.' },
        { status: 400 }
      )
    }

    // 1. 빌링키 발급
    const billingResult = await issueBillingKey(authKey, customerKey)

    if (!billingResult.success) {
      return NextResponse.json(
        { error: billingResult.error.message },
        { status: 400 }
      )
    }

    const billing = billingResult.data

    // 2. 첫 결제 실행
    const orderId = `ORDER_${userId}_${Date.now()}`
    const chargeResult = await chargeBillingKey(
      billing.billingKey,
      customerKey,
      PREMIUM_PRICE.monthly,
      orderId,
      PREMIUM_PRICE.name
    )

    if (!chargeResult.success) {
      return NextResponse.json(
        { error: chargeResult.error.message },
        { status: 400 }
      )
    }

    const payment = chargeResult.data

    // 3. 구독 정보 저장
    const now = new Date()
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const subscriptionResult = await createSubscription({
      user_id: userId,
      billing_key: billing.billingKey,
      customer_key: customerKey,
      card_company: billing.card?.issuerCode || null,
      card_number: billing.card?.number || null,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: nextMonth.toISOString(),
      cancelled_at: null,
    })

    if (subscriptionResult.error) {
      console.error('Failed to create subscription:', subscriptionResult.error)
      return NextResponse.json(
        { error: '구독 정보 저장에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 4. 결제 내역 저장
    await createPaymentHistory({
      user_id: userId,
      subscription_id: subscriptionResult.data!.id,
      payment_key: payment.paymentKey,
      order_id: orderId,
      amount: payment.totalAmount,
      status: 'completed',
      payment_method: payment.method,
      paid_at: payment.approvedAt,
      failed_reason: null,
      receipt_url: payment.receipt?.url || null,
    })

    return NextResponse.json({
      success: true,
      subscription: subscriptionResult.data,
      receipt_url: payment.receipt?.url,
    })
  } catch (error) {
    console.error('Subscribe error:', error)
    return NextResponse.json(
      { error: '결제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
