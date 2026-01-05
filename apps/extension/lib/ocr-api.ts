/**
 * OCR API 호출 유틸리티
 * 이미지 기반 JD를 텍스트로 변환
 */

/**
 * OCR API 호출 (이미지 기반 JD용)
 */
export async function callOcrApi(imageUrls: string[], accessToken: string): Promise<string | null> {
  try {
    const apiUrl = process.env.PLASMO_PUBLIC_DASHBOARD_URL || 'http://localhost:3000'
    const response = await fetch(`${apiUrl}/api/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ imageUrls }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[OCR API] Error:', response.status, errorBody)
      return null
    }

    const result = await response.json()
    if (result.success && result.data?.text) {
      console.log(`[OCR API] Success: ${result.data.text.length} chars`)
      return result.data.text
    }

    return null
  } catch (error) {
    console.error('[OCR API] Call failed:', error)
    return null
  }
}
