/**
 * Payment Types
 * 토스페이먼츠 결제 관련 타입 정의
 */

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due'

export interface Subscription {
  id: string
  user_id: string
  billing_key: string
  customer_key: string
  card_company: string | null
  card_number: string | null
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export type SubscriptionInsert = Omit<Subscription, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type SubscriptionUpdate = Partial<SubscriptionInsert>

export interface PaymentHistory {
  id: string
  user_id: string
  subscription_id: string | null
  payment_key: string
  order_id: string
  amount: number
  status: PaymentStatus
  payment_method: string | null
  paid_at: string | null
  failed_reason: string | null
  receipt_url: string | null
  created_at: string
}

export type PaymentHistoryInsert = Omit<PaymentHistory, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

// 토스페이먼츠 API 응답 타입
export interface TossPaymentBillingKey {
  mId: string
  customerKey: string
  billingKey: string
  authenticatedAt: string
  method: string
  card: {
    issuerCode: string
    acquirerCode: string
    number: string
    cardType: string
    ownerType: string
  }
}

export interface TossPaymentResponse {
  mId: string
  version: string
  paymentKey: string
  orderId: string
  orderName: string
  currency: string
  method: string
  status: string
  requestedAt: string
  approvedAt: string
  card?: {
    company: string
    number: string
    installmentPlanMonths: number
    isInterestFree: boolean
    approveNo: string
    cardType: string
    ownerType: string
    acquireStatus: string
  }
  receipt?: {
    url: string
  }
  totalAmount: number
  suppliedAmount: number
  vat: number
}

export interface TossPaymentError {
  code: string
  message: string
}

// 클라이언트 요청/응답 타입
export interface CreateSubscriptionRequest {
  authKey: string
  customerKey: string
}

export interface CancelSubscriptionRequest {
  subscriptionId: string
}

export interface PaymentResult {
  success: boolean
  message: string
  subscription?: Subscription
  error?: string
}

// 가격 정보
export const PREMIUM_PRICE = {
  monthly: 9900, // 월 9,900원
  currency: 'KRW',
  name: 'Premium 구독',
} as const
