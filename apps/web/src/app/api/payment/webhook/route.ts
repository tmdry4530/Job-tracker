/**
 * 토스페이먼츠 웹훅 API
 * POST /api/payment/webhook
 *
 * 정기결제 자동 갱신 및 결제 실패 처리
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  updateSubscription,
  createPaymentHistory,
  renewSubscription,
} from '@/lib/queries/subscription'

// 서비스 롤 클라이언트 (웹훅은 인증 없이 호출됨)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Supabase service role key is not configured')
  }

  return createClient(url, serviceKey)
}

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

export async function POST(request: Request) {
  try {
    const payload: TossWebhookPayload = await request.json()
    const { eventType, data } = payload

    const supabase = getServiceClient()

    switch (eventType) {
      case 'BILLING_KEY.DELETED': {
        // 빌링키 삭제됨 - 구독 취소 처리
        if (data.customerKey) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
            })
            .eq('customer_key', data.customerKey)

          if (error) {
            console.error('Failed to cancel subscription:', error)
          }
        }
        break
      }

      case 'PAYMENT.DONE': {
        // 결제 완료 - 정기결제 갱신
        if (data.customerKey && data.paymentKey && data.orderId) {
          // 구독 조회
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('customer_key', data.customerKey)
            .single()

          if (subscription) {
            // 구독 갱신
            await renewSubscription(supabase, subscription.id)

            // 결제 내역 추가
            await createPaymentHistory(supabase, {
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              payment_key: data.paymentKey,
              order_id: data.orderId,
              amount: data.amount || 0,
              status: 'completed',
              payment_method: data.method || null,
              paid_at: data.approvedAt || new Date().toISOString(),
              failed_reason: null,
              receipt_url: data.receipt?.url || null,
            })
          }
        }
        break
      }

      case 'PAYMENT.FAILED': {
        // 결제 실패
        if (data.customerKey && data.paymentKey && data.orderId) {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('customer_key', data.customerKey)
            .single()

          if (subscription) {
            // 구독 상태를 past_due로 변경
            await updateSubscription(supabase, subscription.id, {
              status: 'past_due',
            })

            // 실패한 결제 내역 추가
            await createPaymentHistory(supabase, {
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              payment_key: data.paymentKey,
              order_id: data.orderId,
              amount: data.amount || 0,
              status: 'failed',
              payment_method: data.method || null,
              paid_at: null,
              failed_reason: data.failureMessage || 'Unknown error',
              receipt_url: null,
            })
          }
        }
        break
      }

      case 'PAYMENT.CANCELED': {
        // 결제 취소/환불
        if (data.paymentKey) {
          await supabase
            .from('payment_history')
            .update({ status: 'refunded' })
            .eq('payment_key', data.paymentKey)
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
