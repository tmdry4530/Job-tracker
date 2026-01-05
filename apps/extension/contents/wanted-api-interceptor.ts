/**
 * Wanted API Interceptor - Runs in page context to capture API responses
 * Uses postMessage to communicate with isolated content script
 */
import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: [
    'https://www.wanted.co.kr/status/applications*',
  ],
  run_at: 'document_start',
  world: 'MAIN', // Run in page context to intercept fetch
}

// Type for the API response
interface WantedApplication {
  job_id: number
  company_name: string
  company_id: number
  status: string
  create_time: string
  position?: string
}

interface WantedApiResponse {
  applications: WantedApplication[]
  total: number
}

// Store intercepted data
let interceptedApplications: WantedApplication[] = []

/**
 * Send data to content script via postMessage
 */
function sendToContentScript(applications: WantedApplication[]): void {
  window.postMessage({
    type: 'WANTED_APPLICATIONS_INTERCEPTED',
    applications,
  }, '*')
}

// Override fetch to intercept API responses
const originalFetch = window.fetch
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args)

  try {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url

    // Check if this is the applications API
    if (url.includes('/api/v1/applications') || url.includes('/api/v4/applications')) {
      // Clone response to read body without consuming it
      const clonedResponse = response.clone()
      const data = await clonedResponse.json() as WantedApiResponse

      if (data.applications && Array.isArray(data.applications)) {
        interceptedApplications = data.applications
        console.log('[Wanted Interceptor] Captured applications:', interceptedApplications.length)
        // 첫 번째 항목의 전체 구조 출력 (포지션 필드 확인용)
        if (interceptedApplications.length > 0) {
          console.log('[Wanted Interceptor] Sample application structure:', JSON.stringify(interceptedApplications[0], null, 2))
        }

        // Send to content script via postMessage
        sendToContentScript(interceptedApplications)
      }
    }
  } catch (e) {
    // Ignore JSON parse errors for non-JSON responses
  }

  return response
}

// Also override XMLHttpRequest for older API calls
const originalXHROpen = XMLHttpRequest.prototype.open
const originalXHRSend = XMLHttpRequest.prototype.send

XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
  (this as XMLHttpRequest & { _url: string })._url = url.toString()
  return originalXHROpen.apply(this, [method, url, ...rest] as Parameters<typeof originalXHROpen>)
}

XMLHttpRequest.prototype.send = function (...args) {
  this.addEventListener('load', function () {
    try {
      const url = (this as XMLHttpRequest & { _url: string })._url
      if (url && (url.includes('/api/v1/applications') || url.includes('/api/v4/applications'))) {
        const data = JSON.parse(this.responseText) as WantedApiResponse

        if (data.applications && Array.isArray(data.applications)) {
          interceptedApplications = data.applications
          console.log('[Wanted Interceptor XHR] Captured applications:', interceptedApplications.length)

          // Send to content script via postMessage
          sendToContentScript(interceptedApplications)
        }
      }
    } catch (e) {
      // Ignore errors
    }
  })

  return originalXHRSend.apply(this, args as Parameters<typeof originalXHRSend>)
}

console.log('[Wanted Interceptor] API interceptor installed')
