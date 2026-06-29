/**
 * 동기화 서비스
 * 북마크 공고를 웹 API(/api/applications/sync)로 전송하여 저장/업데이트
 */

import type { ParsedBookmark, StoredAuth } from './types'
import { SYNC } from './constants'
import { fetchWantedJd, fetchSaraminJd } from './jd-fetcher'
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
 * JD 콘텐츠 수집
 */
async function fetchJdContent(
  bookmark: ParsedBookmark,
  token: string
): Promise<string | null> {
  if (!bookmark.sourceUrl) {
    return null
  }

  if (bookmark.platform === 'wanted') {
    return fetchWantedJd(bookmark.sourceUrl)
  }

  if (bookmark.platform === 'saramin') {
    const result = await fetchSaraminJd(bookmark.sourceUrl)
    if (!result) {
      return null
    }

    // 이미지 기반 공고면 OCR 시도
    if (result.isImage && result.imageUrls.length > 0) {
      const ocrText = await callOcrApi(result.imageUrls, token)
      if (ocrText) {
        return ocrText
      }
    }

    return result.content
  }

  return null
}

/**
 * 북마크 공고를 웹 API로 동기화
 */
export async function syncBookmarks(
  auth: StoredAuth,
  bookmarks: ParsedBookmark[]
): Promise<SyncResult> {
  // 중복 제거
  const uniqueBookmarks = deduplicateBookmarks(bookmarks)
  console.log(`[Sync] Processing ${uniqueBookmarks.length} bookmarks`)

  // 레코드 생성 (필요 시 JD 수집)
  const records: SyncBookmarkRecord[] = []

  for (let i = 0; i < uniqueBookmarks.length; i += SYNC.BATCH_SIZE) {
    const batch = uniqueBookmarks.slice(i, i + SYNC.BATCH_SIZE)

    for (const bookmark of batch) {
      let jdContent: string | null = bookmark.jdContent ?? null

      if (!jdContent && bookmark.sourceUrl) {
        try {
          jdContent = await fetchJdContent(bookmark, auth.token)
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
        deadline: bookmark.deadline ?? null,
        jdContent,
      })
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
