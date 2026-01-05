/**
 * 파싱 결과 전송 유틸리티
 */

import type { ParsedApplication, ParseMessage, Platform } from './types'

/**
 * Background로 파싱 결과 전송
 */
export async function sendParseResult(
  platform: Platform,
  applications: ParsedApplication[],
  error?: string
): Promise<void> {
  const message: ParseMessage = error
    ? {
        type: 'PARSE_FAILED',
        payload: {
          platform,
          error,
          timestamp: Date.now(),
        },
      }
    : {
        type: 'PARSE_COMPLETED',
        payload: {
          platform,
          applications,
          timestamp: Date.now(),
        },
      }

  try {
    await chrome.runtime.sendMessage(message)
    console.log(`[${platform} Parser] Result sent to background:`, message.type)
  } catch (err) {
    console.error(`[${platform} Parser] Failed to send result:`, err)
  }
}
