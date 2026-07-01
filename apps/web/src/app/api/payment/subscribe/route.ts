/**
 * 구독 생성 API
 * POST /api/payment/subscribe
 *
 * 빌링키 발급 후 첫 결제 및 구독 생성
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { getUserIdFromRequest } from '@/lib/auth/get-user'
import { issueBillingKey, chargeBillingKey, cancelPayment } from '@/lib/toss'
import { db } from '@/lib/db'
import { subscriptions, paymentHistory } from '@/lib/db/schema'
import { fetchSubscription } from '@/lib/queries/subscription'
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
    const { authKey, customerKey, orderId: requestedOrderId } = body

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

    // 멱등키: Toss authKey는 결제 시도당 1회용·고유이므로 이를 결정론적 해시로 orderId화한다.
    // → 동일 결제 시도의 재요청(중복 마운트/새로고침/네트워크 재시도)이 아래 선조회에서 잡혀
    //   이중 청구를 막는다. (클라이언트가 명시적 orderId를 보내면 그 값을 우선 사용)
    const orderId =
      requestedOrderId ||
      `ORDER_${userId}_${createHash('sha256').update(authKey).digest('hex').slice(0, 24)}`

    // 이미 처리된 주문이면 청구 없이 기존 구독을 반환(중복 청구 방지).
    const [existingPayment] = await db
      .select()
      .from(paymentHistory)
      .where(eq(paymentHistory.order_id, orderId))
      .limit(1)
    if (existingPayment) {
      const { data: existingSub } = await fetchSubscription(userId)
      return NextResponse.json({
        success: true,
        subscription: existingSub,
        receipt_url: existingPayment.receipt_url ?? undefined,
        idempotent: true,
      })
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

    // 3. 구독 + 결제 내역 저장 (트랜잭션 + 재구독 upsert)
    //   - 두 insert를 한 트랜잭션으로 묶어 부분 기록을 방지한다.
    //   - user_id unique 위반(재구독) 시 onConflictDoUpdate로 갱신해 "돈만 빠지고 미기록"을 막는다.
    const now = new Date()
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    let subscription
    try {
      subscription = await db.transaction(async (tx) => {
        const [sub] = await tx
          .insert(subscriptions)
          .values({
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
          .onConflictDoUpdate({
            target: subscriptions.user_id,
            set: {
              billing_key: billing.billingKey,
              customer_key: customerKey,
              card_company: billing.card?.issuerCode || null,
              card_number: billing.card?.number || null,
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: nextMonth.toISOString(),
              cancelled_at: null,
              updated_at: now.toISOString(),
            },
          })
          .returning()

        await tx.insert(paymentHistory).values({
          user_id: userId,
          subscription_id: sub.id,
          payment_key: payment.paymentKey,
          order_id: orderId,
          amount: payment.totalAmount,
          status: 'completed',
          payment_method: payment.method,
          paid_at: payment.approvedAt,
          failed_reason: null,
          receipt_url: payment.receipt?.url || null,
        })

        return sub
      })
    } catch (dbError) {
      // 청구는 성공했으나 DB 기록 실패 → 보상 취소로 사용자 손해를 막는다.
      console.error('Failed to persist subscription, attempting refund:', dbError)
      const refund = await cancelPayment(
        payment.paymentKey,
        '구독 정보 저장 실패 보상 취소'
      )
      if (!refund.success) {
        // 보상 취소까지 실패 — 수동 환불 필요. 결제키를 남겨 추적 가능하게 한다.
        console.error(
          'CRITICAL: refund failed, manual intervention required. paymentKey=',
          payment.paymentKey,
          refund.error
        )
      }
      return NextResponse.json(
        { error: '구독 정보 저장에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subscription,
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
