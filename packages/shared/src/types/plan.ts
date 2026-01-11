/**
 * Plan Types
 * 사용자 플랜 관련 타입 정의
 */

export type PlanType = 'free' | 'premium'

export const PLAN_TYPES = ['free', 'premium'] as const

export interface UserPlan {
  id: string
  user_id: string
  plan_type: PlanType
  application_limit: number
  premium_started_at: string | null
  premium_expires_at: string | null
  created_at: string
  updated_at: string
}

export type UserPlanInsert = Omit<UserPlan, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type UserPlanUpdate = Partial<UserPlanInsert>

export interface PlanLimits {
  free: {
    applications: number
    features: string[]
  }
  premium: {
    applications: number // -1 means unlimited
    features: string[]
  }
}

export const PLAN_LIMITS: PlanLimits = {
  free: {
    applications: 100,
    features: [
      '지원 내역 100개까지 저장',
      'AI JD 요약',
      '면접 예상 질문',
      '기본 필터링',
    ],
  },
  premium: {
    applications: -1, // unlimited
    features: [
      '무제한 지원 내역 저장',
      'AI JD 요약',
      '면접 예상 질문',
      '고급 필터링 및 통계',
      '우선 지원',
    ],
  },
}

export interface PlanUsage {
  plan: UserPlan
  currentCount: number
  limit: number
  isUnlimited: boolean
  percentUsed: number
  canAddMore: boolean
}
