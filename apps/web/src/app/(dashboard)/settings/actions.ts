'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUserId } from '@/lib/auth/get-user'
import {
  getUserLlmSettings,
  saveUserLlmSettings,
  deleteUserLlmSettings,
} from '@/lib/queries/llm-settings'

/**
 * LLM 설정 서버 액션 (BYOK)
 *
 * 모든 액션은 requireUserId로 로그인을 강제하고, zod로 입력을 검증한다.
 * 성공/실패는 { success, error? } 형태로 클라이언트 폼에 반환한다.
 */

const SaveLlmSettingsSchema = z.object({
  apiKey: z.string().trim().min(1, 'API 키를 입력해주세요'),
  baseUrl: z
    .string()
    .trim()
    .url('올바른 URL 형식이 아닙니다')
    .optional()
    .or(z.literal('')),
  model: z.string().trim().max(200, '모델명이 너무 깁니다').optional(),
})

export interface SaveLlmSettingsInput {
  apiKey: string
  baseUrl?: string
  model?: string
}

export interface LlmSettingsActionResult {
  success: boolean
  error?: string
}

/**
 * 사용자의 LLM API 키(및 선택 baseUrl/model)를 저장한다.
 * apiKey는 필수, baseUrl은 선택 URL, model은 선택.
 */
export async function saveLlmSettings(
  input: SaveLlmSettingsInput
): Promise<LlmSettingsActionResult> {
  const parsed = SaveLlmSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || '입력값이 유효하지 않습니다',
    }
  }

  try {
    const userId = await requireUserId()

    const baseUrl = parsed.data.baseUrl ? parsed.data.baseUrl : null
    const model = parsed.data.model ? parsed.data.model : null

    await saveUserLlmSettings(userId, {
      apiKey: parsed.data.apiKey,
      baseUrl,
      model,
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'API 키 저장에 실패했습니다',
    }
  }
}

/**
 * 사용자의 LLM 설정을 삭제한다 (API 키 포함).
 */
export async function deleteLlmSettings(): Promise<LlmSettingsActionResult> {
  try {
    const userId = await requireUserId()

    await deleteUserLlmSettings(userId)

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'API 키 삭제에 실패했습니다',
    }
  }
}

export interface MaskedLlmSettings {
  /** 키가 저장되어 있는지 여부 */
  hasKey: boolean
  /** 마스킹된 키 표시용 문자열 (예: ••••1a2b). 키가 없으면 null. */
  maskedKey: string | null
  /** 저장된 baseUrl (없으면 null) */
  baseUrl: string | null
  /** 저장된 model (없으면 null) */
  model: string | null
}

/**
 * 서버 컴포넌트에서 사용자의 LLM 설정을 마스킹된 형태로 로드한다.
 * 평문 API 키는 절대 클라이언트로 넘기지 않는다.
 */
export async function loadMaskedLlmSettings(): Promise<MaskedLlmSettings> {
  const userId = await requireUserId()
  const settings = await getUserLlmSettings(userId)

  const hasKey = Boolean(settings.apiKey)
  const last4 = settings.apiKey ? settings.apiKey.slice(-4) : null

  return {
    hasKey,
    maskedKey: last4 ? `••••${last4}` : null,
    baseUrl: settings.baseUrl,
    model: settings.model,
  }
}
