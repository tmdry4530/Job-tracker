/**
 * 파싱 상태 오버레이 유틸리티
 * 원티드, 사람인 파서에서 공통으로 사용
 */

const OVERLAY_ID = 'job-tracker-overlay'

const OVERLAY_COLORS = {
  loading: '#3B82F6',
  success: '#10B981',
  error: '#EF4444',
} as const

const OVERLAY_ICONS = {
  loading: '📋',
  success: '✓',
  error: '✗',
} as const

export type OverlayType = 'loading' | 'success' | 'error'

/**
 * 파싱 상태 오버레이 표시
 * XSS 방지를 위해 DOM API 사용
 */
export function showOverlay(message: string, type: OverlayType = 'loading'): HTMLElement {
  // 기존 오버레이 제거
  const existing = document.getElementById(OVERLAY_ID)
  if (existing) {
    existing.remove()
  }

  const overlay = document.createElement('div')
  overlay.id = OVERLAY_ID

  const container = document.createElement('div')
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: OVERLAY_COLORS[type],
    color: 'white',
    padding: '12px 20px',
    borderRadius: '8px',
    zIndex: '10000',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  })

  const iconSpan = document.createElement('span')
  iconSpan.textContent = OVERLAY_ICONS[type]

  const messageSpan = document.createElement('span')
  messageSpan.textContent = message

  container.appendChild(iconSpan)
  container.appendChild(messageSpan)
  overlay.appendChild(container)
  document.body.appendChild(overlay)

  return overlay
}

/**
 * 오버레이 자동 제거
 */
export function hideOverlay(delay: number = 3000): void {
  setTimeout(() => {
    const overlay = document.getElementById(OVERLAY_ID)
    if (overlay) {
      overlay.style.transition = 'opacity 0.3s'
      overlay.style.opacity = '0'
      setTimeout(() => overlay.remove(), 300)
    }
  }, delay)
}
