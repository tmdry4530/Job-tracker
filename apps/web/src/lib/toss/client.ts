/**
 * 토스페이먼츠 서버 API 클라이언트
 */

import type {
  TossPaymentBillingKey,
  TossPaymentResponse,
  TossPaymentError,
} from '@job-tracker/shared'
import { envHelpers } from '@/lib/env'

const TOSS_API_URL = 'https://api.tosspayments.com/v1'

type TossResult<T> =
  | { success: true; data: T }
  | { success: false; error: TossPaymentError }

function getAuthHeader(): string {
  const secretKey = envHelpers.toss.secretKey
  if (!secretKey) {
    throw new Error('Toss Payments secret key is not configured')
  }
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
}

async function tossRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<TossResult<T>> {
  try {
    const response = await fetch(`${TOSS_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data as TossPaymentError,
      }
    }

    return {
      success: true,
      data: data as T,
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
      },
    }
  }
}

/**
 * 빌링키 발급 (자동결제용 카드 등록)
 */
export async function issueBillingKey(
  authKey: string,
  customerKey: string
): Promise<TossResult<TossPaymentBillingKey>> {
  return tossRequest<TossPaymentBillingKey>('/billing/authorizations/issue', {
    method: 'POST',
    body: JSON.stringify({
      authKey,
      customerKey,
    }),
  })
}

/**
 * 빌링키로 자동결제 승인
 */
export async function chargeBillingKey(
  billingKey: string,
  customerKey: string,
  amount: number,
  orderId: string,
  orderName: string
): Promise<TossResult<TossPaymentResponse>> {
  return tossRequest<TossPaymentResponse>(`/billing/${billingKey}`, {
    method: 'POST',
    body: JSON.stringify({
      customerKey,
      amount,
      orderId,
      orderName,
    }),
  })
}

/**
 * 결제 취소
 */
export async function cancelPayment(
  paymentKey: string,
  cancelReason: string,
  cancelAmount?: number
): Promise<TossResult<TossPaymentResponse>> {
  const body: Record<string, unknown> = { cancelReason }
  if (cancelAmount) {
    body.cancelAmount = cancelAmount
  }

  return tossRequest<TossPaymentResponse>(`/payments/${paymentKey}/cancel`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * 결제 조회
 */
export async function getPayment(
  paymentKey: string
): Promise<TossResult<TossPaymentResponse>> {
  return tossRequest<TossPaymentResponse>(`/payments/${paymentKey}`)
}

/**
 * 빌링키 삭제 (자동결제 해지)
 */
export async function deleteBillingKey(
  billingKey: string,
  customerKey: string
): Promise<TossResult<{ billingKey: string; customerKey: string }>> {
  return tossRequest(`/billing/authorizations/${billingKey}`, {
    method: 'DELETE',
    body: JSON.stringify({ customerKey }),
  })
}
