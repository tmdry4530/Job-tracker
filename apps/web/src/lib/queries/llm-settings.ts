/**
 * 사용자별 LLM 설정 쿼리 (BYOK)
 *
 * 모든 쿼리는 user_id로 스코프된다. API 키는 저장 시 암호화하고 조회 시 복호화한다.
 */
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userLlmSettings } from '@/lib/db/schema'
import { decrypt, encrypt } from '@/lib/crypto/encryption'

export interface UserLlmSettings {
  apiKey: string | null
  baseUrl: string | null
  model: string | null
}

/**
 * 사용자의 LLM 설정을 조회한다. API 키는 복호화하여 평문으로 반환.
 * 설정이 없으면 모든 필드가 null.
 */
export async function getUserLlmSettings(
  userId: string
): Promise<UserLlmSettings> {
  const [row] = await db
    .select({
      apiKeyEncrypted: userLlmSettings.api_key_encrypted,
      baseUrl: userLlmSettings.base_url,
      model: userLlmSettings.model,
    })
    .from(userLlmSettings)
    .where(eq(userLlmSettings.user_id, userId))
    .limit(1)

  if (!row) {
    return { apiKey: null, baseUrl: null, model: null }
  }

  return {
    apiKey: row.apiKeyEncrypted ? decrypt(row.apiKeyEncrypted) : null,
    baseUrl: row.baseUrl,
    model: row.model,
  }
}

export interface SaveUserLlmSettingsInput {
  apiKey: string | null
  baseUrl: string | null
  model: string | null
}

/**
 * 사용자의 LLM 설정을 저장한다. API 키는 암호화하여 저장.
 * user_id 기준 upsert (있으면 갱신, 없으면 삽입).
 */
export async function saveUserLlmSettings(
  userId: string,
  input: SaveUserLlmSettingsInput
): Promise<void> {
  const apiKeyEncrypted = input.apiKey ? encrypt(input.apiKey) : null

  await db
    .insert(userLlmSettings)
    .values({
      user_id: userId,
      api_key_encrypted: apiKeyEncrypted,
      base_url: input.baseUrl,
      model: input.model,
    })
    .onConflictDoUpdate({
      target: userLlmSettings.user_id,
      set: {
        api_key_encrypted: apiKeyEncrypted,
        base_url: input.baseUrl,
        model: input.model,
        updated_at: new Date().toISOString(),
      },
    })
}

/**
 * 사용자의 LLM 설정을 삭제한다.
 */
export async function deleteUserLlmSettings(userId: string): Promise<void> {
  await db.delete(userLlmSettings).where(eq(userLlmSettings.user_id, userId))
}
