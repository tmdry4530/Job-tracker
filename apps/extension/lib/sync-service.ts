/**
 * 동기화 서비스
 * 북마크 공고를 웹 API(/api/applications/sync)로 전송하여 저장/업데이트
 */

import type { ParsedBookmark, StoredAuth } from './types'
import { SYNC } from './constants'
import { fetchWantedJd, fetchSaraminJd, fetchJobkoreaJd } from './jd-fetcher'
import { callOcrApi } from './ocr-api'
import { apiFetch } from './api-client'

export interface SyncResult {
  syncedCount: number
  skippedCount: number
  timestamp: number
  error?: string
}

/** 서버로 전송할 북마크 레코드 */
interface SyncBookmarkRecord {
  platform: ParsedBookmark['platform']
  companyName: string
  position: string
  sourceUrl: string
  savedAt: string | null
  deadline: string | null
  jdContent: string | null
}

/** 동기화 진행 콜백 타입 */
export type SyncProgressCallback = (current: number, currentItem?: string) => Promise<void>

/**
 * 중복 제거된 북마크 목록 반환
 */
function deduplicateBookmarks(bookmarks: ParsedBookmark[]): ParsedBookmark[] {
  const seen = new Set<string>()
  return bookmarks.filter((b) => {
    const key = b.sourceUrl || `${b.platform}-${b.companyName}-${b.position}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * JD 콘텐츠 + 마감일 수집 (상세페이지에서)
 * - 원티드/잡코리아: 상세페이지 파싱
 * - 사람인: 이미지 기반 공고면 OCR 시도
 */
async function fetchJdContent(
  bookmark: ParsedBookmark,
  token: string
): Promise<{ content: string | null; deadline: string | null }> {
  if (!bookmark.sourceUrl) {
    return { content: null, deadline: null }
  }

  if (bookmark.platform === 'wanted') {
    const result = await fetchWantedJd(bookmark.sourceUrl)
    return { content: result?.content ?? null, deadline: result?.deadline ?? null }
  }

  if (bookmark.platform === 'saramin') {
    const result = await fetchSaraminJd(bookmark.sourceUrl)
    if (!result) {
      return { content: null, deadline: null }
    }

    // 이미지 기반 공고면 OCR 시도
    if (result.isImage && result.imageUrls.length > 0) {
      const ocrText = await callOcrApi(result.imageUrls, token)
      if (ocrText) {
        return { content: ocrText, deadline: result.deadline }
      }
    }

    return { content: result.content, deadline: result.deadline }
  }

  if (bookmark.platform === 'jobkorea') {
    const result = await fetchJobkoreaJd(bookmark.sourceUrl)
    return { content: result?.content ?? null, deadline: result?.deadline ?? null }
  }

  return { content: null, deadline: null }
}

/**
 * 북마크 공고를 웹 API로 동기화
 * - 상세페이지에서 JD/마감일을 수집한 뒤 페이로드에 담아 한 번에 전송
 */
export async function syncBookmarks(
  auth: StoredAuth,
  bookmarks: ParsedBookmark[],
  onProgress?: SyncProgressCallback
): Promise<SyncResult> {
  // 중복 제거
  const uniqueBookmarks = deduplicateBookmarks(bookmarks)
  console.log(`[Sync] Processing ${uniqueBookmarks.length} bookmarks`)

  // 레코드 생성 (필요 시 JD/마감일 수집)
  const records: SyncBookmarkRecord[] = []
  let processedCount = 0

  for (let i = 0; i < uniqueBookmarks.length; i += SYNC.BATCH_SIZE) {
    const batch = uniqueBookmarks.slice(i, i + SYNC.BATCH_SIZE)

    for (const bookmark of batch) {
      // 진행 상황 콜백 호출
      if (onProgress) {
        await onProgress(processedCount + 1, `${bookmark.companyName} - ${bookmark.position}`)
      }

      let jdContent: string | null = bookmark.jdContent ?? null
      let deadline: string | null = bookmark.deadline ?? null

      // JD나 마감일이 없으면 상세페이지에서 수집
      if (bookmark.sourceUrl && (!jdContent || !deadline)) {
        try {
          const jdResult = await fetchJdContent(bookmark, auth.token)
          if (!jdContent) {
            jdContent = jdResult.content
          }
          if (!deadline) {
            deadline = jdResult.deadline
          }
        } catch (error) {
          console.error('[Sync] JD fetch error:', error)
        }
      }

      records.push({
        platform: bookmark.platform,
        companyName: bookmark.companyName,
        position: bookmark.position,
        sourceUrl: bookmark.sourceUrl,
        savedAt: bookmark.savedAt ?? null,
        deadline,
        jdContent,
      })

      processedCount++
    }
  }

  try {
    const response = await apiFetch(
      '/api/applications/sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarks: records }),
      },
      auth.token
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[Sync] API error:', response.status, errorBody)
      return {
        syncedCount: 0,
        skippedCount: records.length,
        timestamp: Date.now(),
        error: '동기화 실패',
      }
    }

    const data = (await response.json()) as {
      syncedCount: number
      skippedCount: number
    }

    console.log(
      `[Sync] Completed: ${data.syncedCount} synced, ${data.skippedCount} skipped`
    )

    return {
      syncedCount: data.syncedCount,
      skippedCount: data.skippedCount,
      timestamp: Date.now(),
    }
  } catch (error) {
    console.error('[Sync] Request failed:', error)
    return {
      syncedCount: 0,
      skippedCount: records.length,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : '동기화 실패',
    }
  }
}
