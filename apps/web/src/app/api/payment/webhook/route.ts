/**
 * 토스페이먼츠 웹훅 API
 * POST /api/payment/webhook
 *
 * 정기결제 자동 갱신 및 결제 실패 처리.
 * 서버-투-서버 호출이므로 사용자 세션이 없음 — customer_key / payment_key로 DB 행을 조회해 처리한다.
 *
 * 보안:
 *  1) TOSS_WEBHOOK_SECRET이 설정되면 원문 바디 HMAC-SHA256 서명을 검증한다.
 *  2) 금액/상태가 걸린 이벤트(PAYMENT.DONE/FAILED/CANCELED)는 Toss API로 재조회해
 *     payload의 금액/상태를 신뢰하지 않고 Toss 권위 값으로만 처리한다(위조 방지).
 */

import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { paymentHistory, subscriptions } from '@/lib/db/schema'
import {
  updateSubscription,
  createPaymentHistory,
  renewSubscription,
} from '@/lib/queries/subscription'
import { getPayment } from '@/lib/toss'

interface TossWebhookPayload {
  eventType: string
  createdAt: string
  data: {
    billingKey?: string
    customerKey?: string
    paymentKey?: string
    orderId?: string
    amount?: number
    status?: string
    method?: string
    approvedAt?: string
    failureCode?: string
    failureMessage?: string
    receipt?: {
      url: string
    }
  }
}

/** 원문 바디에 대한 HMAC-SHA256 서명 검증 (TOSS_WEBHOOK_SECRET 설정 시) */
function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.TOSS_WEBHOOK_SECRET
  // 시크릿 미설정 시 서명 검증은 건너뛴다(금액 이벤트는 아래 Toss 재검증으로 방어).
  if (!secret) return true
  if (!signature) return false

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64')

  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)
}

export async function POST(request: Request) {
  try {
    // 서명 검증을 위해 원문 바디를 먼저 읽는다.
    const rawBody = await request.text()
    const signature =
      request.headers.get('tosspayments-webhook-signature') ??
      request.headers.get('x-tosspayments-signature')

    if (!verifySignature(rawBody, signature)) {
      console.error('[Webhook] 서명 검증 실패')
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }

    let payload: TossWebhookPayload
    try {
      payload = JSON.parse(rawBody) as TossWebhookPayload
    } catch {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
    }

    const { eventType, data } = payload

    switch (eventType) {
      case 'BILLING_KEY.DELETED': {
        // 빌링키 삭제됨 - 구독 취소 처리 (서명 검증으로만 보호되는 이벤트)
        if (data.customerKey) {
          try {
            await db
              .update(subscriptions)
              .set({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
              })
              .where(eq(subscriptions.customer_key, data.customerKey))
          } catch (error) {
            console.error('Failed to cancel subscription:', error)
          }
        }
        break
      }

      case 'PAYMENT.DONE': {
        // 결제 완료 - 정기결제 갱신. Toss API로 재검증 후 권위 값만 사용.
        if (data.customerKey && data.paymentKey && data.orderId) {
          const verified = await getPayment(data.paymentKey)
          if (!verified.success || verified.data.status !== 'DONE') {
            console.error('[Webhook] PAYMENT.DONE 재검증 실패:', data.paymentKey)
            return NextResponse.json(
              { error: 'unverified payment' },
              { status: 400 }
            )
          }

          const [subscription] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.customer_key, data.customerKey))
            .limit(1)

          if (subscription) {
            // 구독 갱신 (subscription.user_id로 이중 격리)
            await renewSubscription(subscription.user_id, subscription.id)

            // 결제 내역 추가 — 금액/상태는 Toss 응답(verified)에서 가져온다.
            await createPaymentHistory({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              payment_key: data.paymentKey,
              order_id: verified.data.orderId,
              amount: verified.data.totalAmount,
              status: 'completed',
              payment_method: verified.data.method || null,
              paid_at: verified.data.approvedAt || new Date().toISOString(),
              failed_reason: null,
              receipt_url: verified.data.receipt?.url || null,
            })
          }
        }
        break
      }

      case 'PAYMENT.FAILED': {
        // 결제 실패 - Toss API로 결제 존재/상태 재검증 후 처리.
        if (data.customerKey && data.paymentKey && data.orderId) {
          const verified = await getPayment(data.paymentKey)
          if (!verified.success || verified.data.status === 'DONE') {
            // 실제로 실패하지 않은(또는 존재하지 않는) 결제로 위조된 이벤트는 무시.
            console.error('[Webhook] PAYMENT.FAILED 재검증 실패:', data.paymentKey)
            return NextResponse.json(
              { error: 'unverified payment' },
              { status: 400 }
            )
          }

          const [subscription] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.customer_key, data.customerKey))
            .limit(1)

          if (subscription) {
            // 구독 상태를 past_due로 변경 (subscription.user_id로 이중 격리)
            await updateSubscription(subscription.user_id, subscription.id, {
              status: 'past_due',
            })

            await createPaymentHistory({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              payment_key: data.paymentKey,
              order_id: data.orderId,
              amount: verified.data.totalAmount,
              status: 'failed',
              payment_method: verified.data.method || null,
              paid_at: null,
              failed_reason: data.failureMessage || 'Unknown error',
              receipt_url: null,
            })
          }
        }
        break
      }

      case 'PAYMENT.CANCELED': {
        // 결제 취소/환불 - Toss API로 취소 상태 재검증 후 처리.
        if (data.paymentKey) {
          const verified = await getPayment(data.paymentKey)
          const status = verified.success ? verified.data.status : ''
          if (!verified.success || !status.includes('CANCEL')) {
            console.error('[Webhook] PAYMENT.CANCELED 재검증 실패:', data.paymentKey)
            return NextResponse.json(
              { error: 'unverified cancellation' },
              { status: 400 }
            )
          }
          try {
            await db
              .update(paymentHistory)
              .set({ status: 'refunded' })
              .where(eq(paymentHistory.payment_key, data.paymentKey))
          } catch (error) {
            console.error('Failed to refund payment:', error)
          }
        }
        break
      }

      default:
        console.log('Unhandled webhook event:', eventType)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
