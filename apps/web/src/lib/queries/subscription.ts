/**
 * 구독 관련 쿼리
 */

import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { paymentHistory, subscriptions } from '@/lib/db/schema'
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
  userId: string
): Promise<QueryResult<Subscription>> {
  try {
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, userId))
      .limit(1)

    return { data: (row as Subscription) ?? null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('구독 조회 실패'),
    }
  }
}

/**
 * 구독 생성
 */
export async function createSubscription(
  subscription: SubscriptionInsert
): Promise<QueryResult<Subscription>> {
  try {
    const [row] = await db
      .insert(subscriptions)
      .values(subscription)
      .returning()

    return { data: (row as Subscription) ?? null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('구독 생성 실패'),
    }
  }
}

/**
 * 구독 업데이트 (id + userId 이중 조건 — 방어 심층 격리)
 */
export async function updateSubscription(
  userId: string,
  subscriptionId: string,
  updates: SubscriptionUpdate
): Promise<QueryResult<Subscription>> {
  try {
    const [row] = await db
      .update(subscriptions)
      .set(updates)
      .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.user_id, userId)))
      .returning()

    return { data: (row as Subscription) ?? null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('구독 업데이트 실패'),
    }
  }
}

/**
 * 구독 취소 (id + userId 이중 조건 — 방어 심층 격리)
 */
export async function cancelSubscription(
  userId: string,
  subscriptionId: string
): Promise<QueryResult<Subscription>> {
  try {
    const [row] = await db
      .update(subscriptions)
      .set({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.user_id, userId)))
      .returning()

    return { data: (row as Subscription) ?? null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('구독 취소 실패'),
    }
  }
}

/**
 * 결제 내역 조회
 */
export async function fetchPaymentHistory(
  userId: string,
  limit = 10
): Promise<{ data: PaymentHistory[]; error: Error | null }> {
  try {
    const rows = await db
      .select()
      .from(paymentHistory)
      .where(eq(paymentHistory.user_id, userId))
      .orderBy(desc(paymentHistory.created_at))
      .limit(limit)

    return { data: rows as PaymentHistory[], error: null }
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('결제 내역 조회 실패'),
    }
  }
}

/**
 * 결제 내역 추가
 */
export async function createPaymentHistory(
  payment: PaymentHistoryInsert
): Promise<QueryResult<PaymentHistory>> {
  try {
    const [row] = await db
      .insert(paymentHistory)
      .values(payment)
      .returning()

    return { data: (row as PaymentHistory) ?? null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('결제 내역 추가 실패'),
    }
  }
}

/**
 * 결제 내역 업데이트 (payment_key + userId 이중 조건 — 방어 심층 격리)
 */
export async function updatePaymentHistory(
  userId: string,
  paymentKey: string,
  updates: Partial<PaymentHistory>
): Promise<QueryResult<PaymentHistory>> {
  try {
    const [row] = await db
      .update(paymentHistory)
      .set(updates)
      .where(and(eq(paymentHistory.payment_key, paymentKey), eq(paymentHistory.user_id, userId)))
      .returning()

    return { data: (row as PaymentHistory) ?? null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('결제 내역 업데이트 실패'),
    }
  }
}

/**
 * 구독 갱신 (다음 결제 주기로) (id + userId 이중 조건 — 방어 심층 격리)
 */
export async function renewSubscription(
  userId: string,
  subscriptionId: string
): Promise<QueryResult<Subscription>> {
  try {
    const now = new Date()
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const [row] = await db
      .update(subscriptions)
      .set({
        current_period_start: now.toISOString(),
        current_period_end: nextMonth.toISOString(),
        status: 'active',
      })
      .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.user_id, userId)))
      .returning()

    return { data: (row as Subscription) ?? null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('구독 갱신 실패'),
    }
  }
}
