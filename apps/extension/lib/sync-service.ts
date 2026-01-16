/**
 * Supabase 동기화 서비스
 * 북마크 공고를 Supabase에 저장/업데이트
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ParsedBookmark } from './types'

// 하위 호환성을 위한 별칭
type ParsedApplication = ParsedBookmark
import { SYNC } from './constants'
import { fetchWantedJd, fetchSaraminJd, fetchJobkoreaJd } from './jd-fetcher'
import { callOcrApi } from './ocr-api'

export interface SyncResult {
  syncedCount: number
  skippedCount: number
  timestamp: number
  error?: string
}

/** 동기화 진행 콜백 타입 */
export type SyncProgressCallback = (current: number, currentItem?: string) => Promise<void>

/**
 * 중복 제거된 애플리케이션 목록 반환
 */
function deduplicateApplications(applications: ParsedApplication[]): ParsedApplication[] {
  const seen = new Set<string>()
  return applications.filter(app => {
    const key = app.sourceUrl || `${app.platform}-${app.companyName}-${app.position}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * 기존 레코드 찾기
 */
async function findExistingApplication(
  supabase: SupabaseClient,
  userId: string,
  app: ParsedApplication
): Promise<{ id: string; jd_content: string | null; position?: string } | null> {
  // source_url로 검색
  if (app.sourceUrl) {
    const { data } = await supabase
      .from('applications')
      .select('id, jd_content')
      .eq('user_id', userId)
      .eq('source_url', app.sourceUrl)
      .maybeSingle()
    if (data) return data
  }

  // company_name으로 검색
  const { data } = await supabase
    .from('applications')
    .select('id, jd_content, position')
    .eq('user_id', userId)
    .eq('platform', app.platform)
    .eq('company_name', app.companyName)
    .maybeSingle()

  return data
}

/**
 * JD 콘텐츠 + 마감일 수집
 */
async function fetchJdContent(
  app: ParsedApplication,
  accessToken?: string
): Promise<{ content: string | null; isImageBased: boolean; deadline: string | null }> {
  if (!app.sourceUrl) {
    return { content: null, isImageBased: false, deadline: null }
  }

  if (app.platform === 'wanted') {
    const result = await fetchWantedJd(app.sourceUrl)
    if (!result) {
      return { content: null, isImageBased: false, deadline: null }
    }
    return { content: result.content, isImageBased: false, deadline: result.deadline }
  }

  if (app.platform === 'saramin') {
    const result = await fetchSaraminJd(app.sourceUrl)
    if (!result) {
      return { content: null, isImageBased: false, deadline: null }
    }

    // 이미지 기반 공고면 OCR 시도
    if (result.isImage && result.imageUrls.length > 0 && accessToken) {
      const ocrText = await callOcrApi(result.imageUrls, accessToken)
      if (ocrText) {
        return { content: ocrText, isImageBased: true, deadline: result.deadline }
      }
    }

    return { content: result.content, isImageBased: result.isImage, deadline: result.deadline }
  }

  if (app.platform === 'jobkorea') {
    const result = await fetchJobkoreaJd(app.sourceUrl)
    if (!result) {
      return { content: null, isImageBased: false, deadline: null }
    }
    return { content: result.content, isImageBased: false, deadline: result.deadline }
  }

  return { content: null, isImageBased: false, deadline: null }
}

/**
 * 단일 애플리케이션 동기화
 */
async function syncSingleApplication(
  supabase: SupabaseClient,
  userId: string,
  app: ParsedApplication,
  accessToken?: string
): Promise<boolean> {
  const existing = await findExistingApplication(supabase, userId, app)

  // JD + 마감일 수집 (상세페이지에서)
  const jdResult = await fetchJdContent(app, accessToken)
  // 마감일: 상세페이지에서 가져온 값 우선, 없으면 파싱된 값 사용
  const deadline = jdResult.deadline || app.deadline || null

  if (existing) {
    // 기존 레코드 업데이트
    const { error } = await supabase
      .from('applications')
      .update({
        position: app.position,
        source_url: app.sourceUrl,
        saved_at: app.savedAt,
        ...(deadline ? { deadline } : {}),
        ...(jdResult.content && !existing.jd_content ? { jd_content: jdResult.content } : {}),
      })
      .eq('id', existing.id)

    if (error) {
      console.error('[Sync] Update error:', error.message, error.details, error.hint)
    }
    return !error
  } else {
    // 새로 삽입
    const { error } = await supabase
      .from('applications')
      .insert({
        user_id: userId,
        platform: app.platform,
        company_name: app.companyName,
        position: app.position,
        source_url: app.sourceUrl,
        jd_content: jdResult.content,
        saved_at: app.savedAt,
        ...(deadline ? { deadline } : {}),
      })

    if (error) {
      console.error('[Sync] Insert error:', error.message, error.details, error.hint)
    }
    return !error
  }
}

/**
 * Supabase에 북마크 공고 동기화
 */
export async function syncApplicationsToSupabase(
  supabase: SupabaseClient,
  applications: ParsedApplication[],
  onProgress?: SyncProgressCallback
): Promise<SyncResult> {
  // 현재 사용자 정보
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { syncedCount: 0, skippedCount: 0, timestamp: Date.now(), error: '사용자 인증 실패' }
  }

  // 세션 토큰 가져오기
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token

  // 중복 제거
  const uniqueApplications = deduplicateApplications(applications)
  console.log(`[Sync] Processing ${uniqueApplications.length} applications`)

  let syncedCount = 0
  let skippedCount = 0
  let processedCount = 0

  // 배치 처리
  for (let i = 0; i < uniqueApplications.length; i += SYNC.BATCH_SIZE) {
    const batch = uniqueApplications.slice(i, i + SYNC.BATCH_SIZE)

    for (const app of batch) {
      try {
        // 진행 상황 콜백 호출
        if (onProgress) {
          await onProgress(processedCount + 1, `${app.companyName} - ${app.position}`)
        }

        const success = await syncSingleApplication(supabase, user.id, app, accessToken)
        if (success) {
          syncedCount++
        } else {
          skippedCount++
        }
      } catch (error) {
        console.error('[Sync] Item error:', error)
        skippedCount++
      }
      processedCount++
    }
  }

  console.log(`[Sync] Completed: ${syncedCount} synced, ${skippedCount} skipped`)

  return { syncedCount, skippedCount, timestamp: Date.now() }
}
