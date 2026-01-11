import { useEffect, useState } from 'react'
import './style.css'
import type { StoredSession, ParsedApplication } from '~lib/types'
import { isSessionExpired } from '~lib/supabase'

const DASHBOARD_URL = process.env.PLASMO_PUBLIC_DASHBOARD_URL || 'http://localhost:3000'

interface SyncResult {
  syncedCount?: number
  skippedCount?: number
  error?: string
}

function IndexPopup() {
  const [session, setSession] = useState<StoredSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingApplications, setPendingApplications] = useState<ParsedApplication[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)

  useEffect(() => {
    // 초기 데이터 로드
    chrome.storage.local.get(['session', 'pendingApplications', 'lastSyncTime'], (result) => {
      const storedSession = result.session as StoredSession | undefined
      if (storedSession && !isSessionExpired(storedSession)) {
        setSession(storedSession)
      } else {
        setSession(null)
      }

      if (result.pendingApplications) {
        setPendingApplications(result.pendingApplications)
      }

      if (result.lastSyncTime) {
        setLastSyncTime(result.lastSyncTime)
      }

      setLoading(false)
    })

    // 스토리지 변경 감지
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local') {
        if (changes.session) {
          const newSession = changes.session.newValue as StoredSession | undefined
          if (newSession && !isSessionExpired(newSession)) {
            setSession(newSession)
          } else {
            setSession(null)
          }
        }
        if (changes.pendingApplications) {
          setPendingApplications(changes.pendingApplications.newValue || [])
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
    if (!session || pendingApplications.length === 0) return

    setSyncing(true)
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
    } finally {
      setSyncing(false)
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
        {session ? (
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
            로그인됨: {session.user.email}
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
      {pendingApplications.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              대기 중인 지원 내역
            </span>
            <span className="text-sm font-bold text-blue-600">
              {pendingApplications.length}개
            </span>
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

      {/* 동기화 결과 */}
      {syncResult && (
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
        {session && pendingApplications.length > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`w-full py-2 px-4 text-sm rounded-md transition-colors ${
              syncing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {syncing ? '동기화 중...' : `지금 동기화 (${pendingApplications.length}개)`}
          </button>
        )}

        {/* 대시보드/로그인 버튼 */}
        {session ? (
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
      {session && pendingApplications.length === 0 && !lastSyncTime && (
        <p className="mt-4 text-xs text-gray-400 text-center">
          원티드 또는 사람인 지원현황 페이지를 방문하면<br />
          자동으로 지원 내역을 수집합니다.
        </p>
      )}
    </div>
  )
}

export default IndexPopup
