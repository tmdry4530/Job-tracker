import { SupabaseClient } from '@supabase/supabase-js'
import type { Application, BookmarkStatus, Platform } from '@job-tracker/shared'

export interface FetchApplicationsParams {
  search?: string
  platform?: Platform
  status?: BookmarkStatus
}

export async function fetchApplications(
  supabase: SupabaseClient,
  params: FetchApplicationsParams = {}
): Promise<{ data: Application[]; error: Error | null }> {
  let query = supabase
    .from('applications')
    .select('*')
    .order('saved_at', { ascending: false, nullsFirst: false })

  if (params.search) {
    // 특수문자 이스케이프 (%, _, \)
    const sanitized = params.search.replace(/[%_\\]/g, '\\$&')
    query = query.or(
      `company_name.ilike.%${sanitized}%,position.ilike.%${sanitized}%`
    )
  }

  if (params.platform) {
    query = query.eq('platform', params.platform)
  }

  if (params.status) {
    query = query.eq('status', params.status)
  }

  const { data, error } = await query

  return {
    data: (data as Application[]) ?? [],
    error: error ? new Error(error.message) : null,
  }
}

export async function fetchApplicationById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: Application | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .single()

  return {
    data: data as Application | null,
    error: error ? new Error(error.message) : null,
  }
}
