import { type SQL, and, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import type { Application, BookmarkStatus, Platform } from '@job-tracker/shared'

export interface FetchApplicationsParams {
  search?: string
  platform?: Platform
  status?: BookmarkStatus
}

export async function fetchApplications(
  userId: string,
  params: FetchApplicationsParams = {}
): Promise<{ data: Application[]; error: Error | null }> {
  try {
    const conditions: SQL[] = [eq(applications.user_id, userId)]

    if (params.search) {
      // 특수문자 이스케이프 (%, _, \) — PostgreSQL LIKE 기본 이스케이프 문자(\) 사용
      const sanitized = params.search.replace(/[%_\\]/g, '\\$&')
      conditions.push(
        or(
          ilike(applications.company_name, `%${sanitized}%`),
          ilike(applications.position, `%${sanitized}%`)
        )!
      )
    }

    if (params.platform) {
      conditions.push(eq(applications.platform, params.platform))
    }

    if (params.status) {
      conditions.push(eq(applications.status, params.status))
    }

    const rows = await db
      .select()
      .from(applications)
      .where(and(...conditions))
      .orderBy(sql`${applications.saved_at} desc nulls last`)

    return { data: rows as Application[], error: null }
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('지원 내역 조회 실패'),
    }
  }
}

export async function fetchApplicationById(
  userId: string,
  id: string
): Promise<{ data: Application | null; error: Error | null }> {
  try {
    const [row] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.user_id, userId)))
      .limit(1)

    return { data: (row as Application) ?? null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('지원 내역 조회 실패'),
    }
  }
}
