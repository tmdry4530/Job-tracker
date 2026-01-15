/**
 * Wanted API Interceptor - Runs in page context to capture API responses
 * Uses postMessage to communicate with isolated content script
 *
 * 전략: 페이지네이션 버튼을 클릭해서 웹사이트가 직접 API 호출하게 하고 응답 인터셉트
 */
import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: [
    'https://www.wanted.co.kr/status/applications*',
  ],
  run_at: 'document_start',
  world: 'MAIN',
}

interface WantedApplication {
  job_id: number
  company_name: string
  company_id: number
  status: string
  create_time: string
  position?: string
}

// 수집된 모든 데이터
let allApplications: WantedApplication[] = []
let expectedTotal = 0
let isCollecting = false
let collectingResolve: ((apps: WantedApplication[]) => void) | null = null

/**
 * Send data to content script via postMessage
 */
function sendToContentScript(applications: WantedApplication[], total: number): void {
  window.postMessage({
    type: 'WANTED_APPLICATIONS_INTERCEPTED',
    applications,
    total,
  }, window.location.origin)
}

/**
 * 다음 페이지 버튼 찾기 및 클릭
 */
function clickNextPage(): boolean {
  // 페이지네이션 버튼 셀렉터들
  const selectors = [
    'button[class*="Pagination"] svg[class*="right"]',  // 오른쪽 화살표 SVG가 있는 버튼
    '[class*="Pagination"] button:last-child',
    '[class*="pagination"] button:last-child',
    'button[aria-label*="next"]',
    'button[aria-label*="다음"]',
    '[class*="next"]',
  ]

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector)
    for (const el of elements) {
      const button = el.closest('button') || el as HTMLButtonElement
      if (button && !button.disabled && button.tagName === 'BUTTON') {
        console.log('[Wanted Interceptor] Clicking next page button')
        button.click()
        return true
      }
    }
  }

  // SVG 아이콘으로 다음 버튼 찾기
  const svgs = document.querySelectorAll('svg')
  for (const svg of svgs) {
    const path = svg.querySelector('path')
    if (path) {
      const d = path.getAttribute('d')
      // 오른쪽 화살표 패턴 (chevron right)
      if (d && (d.includes('l5') || d.includes('L5') || d.includes('right'))) {
        const button = svg.closest('button')
        if (button && !button.disabled) {
          console.log('[Wanted Interceptor] Clicking next page button (via SVG)')
          button.click()
          return true
        }
      }
    }
  }

  console.log('[Wanted Interceptor] Next page button not found')
  return false
}

/**
 * 모든 페이지 수집
 */
async function collectAllPages(initialApps: WantedApplication[], total: number): Promise<WantedApplication[]> {
  if (isCollecting) return initialApps
  if (initialApps.length >= total) return initialApps

  isCollecting = true
  allApplications = [...initialApps]
  expectedTotal = total

  console.log(`[Wanted Interceptor] Starting collection: ${initialApps.length}/${total}`)

  // 페이지 클릭으로 추가 데이터 수집
  let attempts = 0
  const maxAttempts = 10

  while (allApplications.length < expectedTotal && attempts < maxAttempts) {
    attempts++

    // 다음 페이지 버튼 클릭
    const clicked = clickNextPage()
    if (!clicked) {
      console.log('[Wanted Interceptor] No more pages to click')
      break
    }

    // API 응답 대기 (응답은 fetch/XHR 인터셉터에서 처리됨)
    await new Promise(resolve => setTimeout(resolve, 1500))

    console.log(`[Wanted Interceptor] After click: ${allApplications.length}/${expectedTotal}`)
  }

  isCollecting = false
  console.log(`[Wanted Interceptor] Collection complete: ${allApplications.length} items`)

  return allApplications
}

/**
 * API 응답에서 데이터 추가
 */
function handleApiResponse(applications: WantedApplication[], total: number): void {
  if (isCollecting) {
    // 수집 중: 데이터 추가 (중복 제거)
    const existingIds = new Set(allApplications.map(app => app.job_id))
    const newApps = applications.filter(app => !existingIds.has(app.job_id))

    if (newApps.length > 0) {
      allApplications.push(...newApps)
      console.log(`[Wanted Interceptor] Added ${newApps.length} new items, total: ${allApplications.length}`)
    }
  } else {
    // 첫 번째 응답: 페이지네이션 시작
    console.log(`[Wanted Interceptor] First response: ${applications.length}/${total}`)

    if (total > applications.length) {
      // 추가 페이지 수집 시작
      collectAllPages(applications, total).then(allApps => {
        console.log(`[Wanted Interceptor] Sending ${allApps.length} items to content script`)
        sendToContentScript(allApps, total)
      })
    } else {
      // 추가 페이지 없음
      sendToContentScript(applications, total)
    }
  }
}

// Override fetch
const originalFetch = window.fetch
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args)

  try {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url

    if (url.includes('/api/v1/applications') || url.includes('/api/v4/applications')) {
      const clonedResponse = response.clone()
      const data = await clonedResponse.json()

      const applications = data.applications || data.data?.applications || []
      const total = data.total || data.data?.total || applications.length

      if (Array.isArray(applications) && applications.length > 0) {
        handleApiResponse(applications as WantedApplication[], total)
      }
    }
  } catch {
    // Ignore errors
  }

  return response
}

// Override XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open
const originalXHRSend = XMLHttpRequest.prototype.send

interface ExtendedXHR extends XMLHttpRequest {
  _url: string
}

XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
  (this as ExtendedXHR)._url = url.toString()
  return originalXHROpen.apply(this, [method, url, ...rest] as Parameters<typeof originalXHROpen>)
}

XMLHttpRequest.prototype.send = function (...args) {
  this.addEventListener('load', function () {
    try {
      const url = (this as ExtendedXHR)._url

      if (url && (url.includes('/api/v1/applications') || url.includes('/api/v4/applications'))) {
        const data = JSON.parse(this.responseText)

        const applications = data.applications || data.data?.applications || []
        const total = data.total || data.data?.total || applications.length

        if (Array.isArray(applications) && applications.length > 0) {
          handleApiResponse(applications as WantedApplication[], total)
        }
      }
    } catch {
      // Ignore errors
    }
  })

  return originalXHRSend.apply(this, args as Parameters<typeof originalXHRSend>)
}

console.log('[Wanted Interceptor] API interceptor installed (pagination click mode)')
