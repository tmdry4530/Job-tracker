import { useEffect, useState } from 'react'
import './style.css'
import type { StoredAuth, ParsedApplication } from '~lib/types'

const DASHBOARD_URL = process.env.PLASMO_PUBLIC_DASHBOARD_URL || 'http://localhost:3000'

/** 동기화 타임아웃 (5분) */
const SYNC_TIMEOUT_MS = 5 * 60 * 1000

interface SyncResult {
  syncedCount?: number
  skippedCount?: number
  error?: string
}

interface SyncProgress {
  current: number
  total: number
  currentItem?: string
  startedAt: number
}

function IndexPopup() {
  const [auth, setAuth] = useState<StoredAuth | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingApplications, setPendingApplications] = useState<ParsedApplication[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)

  useEffect(() => {
    // 초기 데이터 로드
    chrome.storage.local.get(['auth', 'pendingApplications', 'lastSyncTime', 'isSyncing', 'syncProgress'], (result) => {
      const storedAuth = result.auth as StoredAuth | undefined
      setAuth(storedAuth || null)

      if (result.pendingApplications) {
        setPendingApplications(result.pendingApplications)
      }

      if (result.lastSyncTime) {
        setLastSyncTime(result.lastSyncTime)
      }

      // 동기화 진행 상태 복원 (타임아웃 체크)
      const progress = result.syncProgress as SyncProgress | undefined
      if (result.isSyncing && progress?.startedAt) {
        const elapsed = Date.now() - progress.startedAt
        if (elapsed > SYNC_TIMEOUT_MS) {
          // 타임아웃된 동기화 상태 정리
          console.log('[Popup] Clearing stale sync state')
          chrome.storage.local.set({ isSyncing: false, syncProgress: null })
          setSyncing(false)
          setSyncProgress(null)
        } else {
          setSyncing(true)
          setSyncProgress(progress)
        }
      } else {
        setSyncing(false)
        setSyncProgress(null)
      }

      setLoading(false)
    })

    // 스토리지 변경 감지
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local') {
        if (changes.auth) {
          const newAuth = changes.auth.newValue as StoredAuth | undefined
          setAuth(newAuth || null)
        }
        if (changes.pendingApplications) {
          setPendingApplications(changes.pendingApplications.newValue || [])
        }
        // 동기화 상태 변경 감지
        if (changes.isSyncing !== undefined) {
          setSyncing(changes.isSyncing.newValue || false)
        }
        // 동기화 진행 상황 변경 감지
        if (changes.syncProgress !== undefined) {
          setSyncProgress(changes.syncProgress.newValue || null)
        }
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const openDashboard = () => {
    chrome.tabs.create({ url: DASHBOARD_URL })
  }

  const openLogin = () => {
    chrome.tabs.create({ url: `${DASHBOARD_URL}/login` })
  }

  const handleSync = async () => {
    if (!auth || pendingApplications.length === 0 || syncing) return

    setSyncResult(null)

    try {
      const response = await chrome.runtime.sendMessage({ type: 'SYNC_REQUEST' })
      setSyncResult(response)

      // 동기화 성공 시 lastSyncTime 업데이트
      if (response && !response.error) {
        const now = Date.now()
        setLastSyncTime(now)
        await chrome.storage.local.set({ lastSyncTime: now })
      }
    } catch (error) {
      setSyncResult({ error: '동기화 요청 실패' })
    }
    // syncing 상태는 storage change 리스너에서 자동으로 업데이트됨
  }

  const handleClearPending = async () => {
    if (syncing || pendingApplications.length === 0) return

    try {
      await chrome.runtime.sendMessage({ type: 'CLEAR_PENDING' })
      setSyncResult(null)
    } catch (error) {
      console.error('[Popup] Failed to clear pending:', error)
    }
  }

  const formatLastSyncTime = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    return `${days}일 전`
  }

  if (loading) {
    return (
      <div className="w-80 p-4 bg-white">
        <div className="text-center text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="w-80 p-4 bg-white">
      <h1 className="text-lg font-bold text-gray-900">
        Job Application Tracker
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        채용 플랫폼 지원 현황을 자동으로 수집합니다.
      </p>

      {/* 로그인 상태 */}
      <div className="mt-4 space-y-2">
        {auth ? (
          <div className="flex items-center text-sm text-green-600">
            <svg
              className="w-4 h-4 mr-1.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            로그인됨
          </div>
        ) : (
          <div className="flex items-center text-sm text-gray-500">
            <svg
              className="w-4 h-4 mr-1.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            로그인이 필요합니다
          </div>
        )}
      </div>

      {/* 대기 중인 지원 내역 */}
      {pendingApplications.length > 0 && !syncing && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              대기 중인 수집 내역
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-blue-600">
                {pendingApplications.length}개
              </span>
              <button
                onClick={handleClearPending}
                className="text-xs text-red-500 hover:text-red-700 hover:underline"
                title="수집 내역 취소"
              >
                취소
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-600">
            {pendingApplications.slice(0, 3).map((app, idx) => (
              <div key={idx} className="truncate">
                • {app.companyName} - {app.position}
              </div>
            ))}
            {pendingApplications.length > 3 && (
              <div className="text-blue-500">
                ... 외 {pendingApplications.length - 3}개
              </div>
            )}
          </div>
        </div>
      )}

      {/* 동기화 진행 상황 */}
      {syncing && syncProgress && (
        <div className="mt-3 p-3 bg-blue-50 rounded-md">
          <div className="flex items-center justify-between text-sm text-blue-800">
            <span className="font-medium">동기화 중...</span>
            <span>{syncProgress.current} / {syncProgress.total}</span>
          </div>
          {/* 진행률 바 */}
          <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
            />
          </div>
          {/* 현재 항목 */}
          {syncProgress.currentItem && (
            <p className="mt-1.5 text-xs text-blue-600 truncate">
              {syncProgress.currentItem}
            </p>
          )}
        </div>
      )}

      {/* 동기화 결과 */}
      {syncResult && !syncing && (
        <div className={`mt-3 p-2 rounded-md text-sm ${
          syncResult.error
            ? 'bg-red-50 text-red-700'
            : 'bg-green-50 text-green-700'
        }`}>
          {syncResult.error
            ? `❌ ${syncResult.error}`
            : `✓ ${syncResult.syncedCount}개 동기화 완료`
          }
        </div>
      )}

      {/* 버튼 영역 */}
      <div className="mt-4 space-y-2">
        {/* 동기화 버튼 */}
        {auth && (pendingApplications.length > 0 || syncing) && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`w-full py-2 px-4 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${
              syncing
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {syncProgress
                  ? `동기화 중... (${syncProgress.current}/${syncProgress.total})`
                  : '동기화 중...'
                }
              </>
            ) : (
              `지금 동기화 (${pendingApplications.length}개)`
            )}
          </button>
        )}

        {/* 대시보드/로그인 버튼 */}
        {auth ? (
          <button
            onClick={openDashboard}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            대시보드 열기
          </button>
        ) : (
          <button
            onClick={openLogin}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            로그인하기
          </button>
        )}
      </div>

      {/* 마지막 동기화 시간 */}
      {lastSyncTime && (
        <p className="mt-3 text-xs text-gray-400 text-center">
          마지막 동기화: {formatLastSyncTime(lastSyncTime)}
        </p>
      )}

      {/* 사용 안내 */}
      {auth && pendingApplications.length === 0 && !syncing && !lastSyncTime && (
        <p className="mt-4 text-xs text-gray-400 text-center">
          원티드, 사람인, 잡코리아 스크랩 페이지를<br />
          방문하면 자동으로 북마크를 수집합니다.
        </p>
      )}
    </div>
  )
}

export default IndexPopup
