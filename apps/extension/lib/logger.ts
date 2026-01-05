/**
 * 로깅 유틸리티
 * 개발/프로덕션 환경에 따라 로그 출력 제어
 */

const isDev = process.env.NODE_ENV !== 'production'

type LogLevel = 'log' | 'warn' | 'error'

/**
 * 개발 환경에서만 로그 출력하는 래퍼
 */
function createLogger(prefix: string) {
  const format = (level: LogLevel, ...args: unknown[]) => {
    if (!isDev && level === 'log') return
    console[level](`[${prefix}]`, ...args)
  }

  return {
    log: (...args: unknown[]) => format('log', ...args),
    warn: (...args: unknown[]) => format('warn', ...args),
    error: (...args: unknown[]) => format('error', ...args),
  }
}

/** Background Script 로거 */
export const bgLogger = createLogger('Extension BG')

/** Wanted Parser 로거 */
export const wantedLogger = createLogger('Wanted Parser')

/** Saramin Parser 로거 */
export const saraminLogger = createLogger('Saramin Parser')

/** Sync 로거 */
export const syncLogger = createLogger('Sync')

/** JD Fetcher 로거 */
export const jdLogger = createLogger('JD Fetcher')

/** OCR 로거 */
export const ocrLogger = createLogger('OCR')
