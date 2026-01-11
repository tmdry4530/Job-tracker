import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanUsage, UserPlan } from '@job-tracker/shared'
import { PLAN_LIMITS } from '@job-tracker/shared'

/**
 * 사용자 플랜 조회
 */
export async function fetchUserPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: UserPlan | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('user_plans')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (신규 사용자)
    return { data: null, error: new Error(error.message) }
  }

  return { data, error: null }
}

/**
 * 사용자 지원 내역 개수 조회
 */
export async function fetchApplicationCount(
  supabase: SupabaseClient,
  userId: string
): Promise<{ count: number; error: Error | null }> {
  const { count, error } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    return { count: 0, error: new Error(error.message) }
  }

  return { count: count ?? 0, error: null }
}

/**
 * 플랜 사용량 조회 (플랜 + 현재 사용량)
 */
export async function fetchPlanUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: PlanUsage | null; error: Error | null }> {
  const [planResult, countResult] = await Promise.all([
    fetchUserPlan(supabase, userId),
    fetchApplicationCount(supabase, userId),
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
