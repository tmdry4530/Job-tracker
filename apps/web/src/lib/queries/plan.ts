import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, userPlans } from '@/lib/db/schema'
import type { PlanUsage, UserPlan } from '@job-tracker/shared'
import { PLAN_LIMITS } from '@job-tracker/shared'

/**
 * 사용자 플랜 조회
 */
export async function fetchUserPlan(
  userId: string
): Promise<{ data: UserPlan | null; error: Error | null }> {
  try {
    const [row] = await db
      .select()
      .from(userPlans)
      .where(eq(userPlans.user_id, userId))
      .limit(1)

    // 행이 없으면 신규 사용자 → null 반환 (에러 아님)
    return { data: (row as UserPlan) ?? null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('플랜 조회 실패'),
    }
  }
}

/**
 * 사용자 지원 내역 개수 조회
 */
export async function fetchApplicationCount(
  userId: string
): Promise<{ count: number; error: Error | null }> {
  try {
    const [row] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(applications)
      .where(eq(applications.user_id, userId))

    return { count: row?.value ?? 0, error: null }
  } catch (error) {
    return {
      count: 0,
      error: error instanceof Error ? error : new Error('지원 내역 개수 조회 실패'),
    }
  }
}

/**
 * 플랜 사용량 조회 (플랜 + 현재 사용량)
 */
export async function fetchPlanUsage(
  userId: string
): Promise<{ data: PlanUsage | null; error: Error | null }> {
  const [planResult, countResult] = await Promise.all([
    fetchUserPlan(userId),
    fetchApplicationCount(userId),
  ])

  if (planResult.error) {
    return { data: null, error: planResult.error }
  }

  if (countResult.error) {
    return { data: null, error: countResult.error }
  }

  // 플랜이 없으면 기본 무료 플랜
  const plan: UserPlan = planResult.data ?? {
    id: '',
    user_id: userId,
    plan_type: 'free',
    application_limit: PLAN_LIMITS.free.applications,
    premium_started_at: null,
    premium_expires_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const limit = plan.plan_type === 'premium' ? -1 : plan.application_limit
  const isUnlimited = limit === -1
  const currentCount = countResult.count

  const usage: PlanUsage = {
    plan,
    currentCount,
    limit,
    isUnlimited,
    percentUsed: isUnlimited ? 0 : Math.round((currentCount / limit) * 100),
    canAddMore: isUnlimited || currentCount < limit,
  }

  return { data: usage, error: null }
}
