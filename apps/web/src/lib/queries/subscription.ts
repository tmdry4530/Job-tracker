/**
 * 구독 관련 쿼리
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Subscription,
  SubscriptionInsert,
  SubscriptionUpdate,
  PaymentHistory,
  PaymentHistoryInsert,
} from '@job-tracker/shared'

type QueryResult<T> = {
  data: T | null
  error: Error | null
}

/**
 * 사용자의 활성 구독 조회
 */
export async function fetchSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<QueryResult<Subscription>> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  return { data, error }
}

/**
 * 구독 생성
 */
export async function createSubscription(
  supabase: SupabaseClient,
  subscription: SubscriptionInsert
): Promise<QueryResult<Subscription>> {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(subscription)
    .select()
    .single()

  return { data, error }
}

/**
 * 구독 업데이트
 */
export async function updateSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
  updates: SubscriptionUpdate
): Promise<QueryResult<Subscription>> {
  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .select()
    .single()

  return { data, error }
}

/**
 * 구독 취소
 */
export async function cancelSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<QueryResult<Subscription>> {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single()

  return { data, error }
}

/**
 * 결제 내역 조회
 */
export async function fetchPaymentHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 10
): Promise<{ data: PaymentHistory[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('payment_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data: data || [], error }
}

/**
 * 결제 내역 추가
 */
export async function createPaymentHistory(
  supabase: SupabaseClient,
  payment: PaymentHistoryInsert
): Promise<QueryResult<PaymentHistory>> {
  const { data, error } = await supabase
    .from('payment_history')
    .insert(payment)
    .select()
    .single()

  return { data, error }
}

/**
 * 결제 내역 업데이트
 */
export async function updatePaymentHistory(
  supabase: SupabaseClient,
  paymentKey: string,
  updates: Partial<PaymentHistory>
): Promise<QueryResult<PaymentHistory>> {
  const { data, error } = await supabase
    .from('payment_history')
    .update(updates)
    .eq('payment_key', paymentKey)
    .select()
    .single()

  return { data, error }
}

/**
 * 구독 갱신 (다음 결제 주기로)
 */
export async function renewSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<QueryResult<Subscription>> {
  const now = new Date()
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      current_period_start: now.toISOString(),
      current_period_end: nextMonth.toISOString(),
      status: 'active',
    })
    .eq('id', subscriptionId)
    .select()
    .single()

  return { data, error }
}
