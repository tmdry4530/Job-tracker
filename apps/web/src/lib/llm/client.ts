import Anthropic from '@anthropic-ai/sdk'

/**
 * LLM 클라이언트 (GLM via Z.ai Anthropic 호환 엔드포인트)
 *
 * BYOK(Bring Your Own Key): 공유 API 키를 두지 않는다. 각 호출은 호출부가
 * 해석해 넘긴 사용자별 자격증명(apiKey + 선택 baseURL/model)으로 새 클라이언트를
 * 생성한다. Z.ai가 Anthropic Messages 프로토콜과 호환되므로 @anthropic-ai/sdk를
 * 그대로 재사용하고 baseURL/키/모델만 교체한다.
 *
 *  - baseURL 기본: https://api.z.ai/api/anthropic
 *                  (중국 Zhipu 플랫폼은 https://open.bigmodel.cn/api/anthropic)
 *  - model 기본  : glm-4.6 (플래그십은 glm-5.2, 저가형은 glm-4.5-flash)
 */

export const DEFAULT_BASE_URL = 'https://api.z.ai/api/anthropic'
export const DEFAULT_MODEL = 'glm-4.6'

/** apiKey가 없을 때 던지는 타입 있는 에러 (호출부에서 식별 가능) */
export class LlmApiKeyMissingError extends Error {
  constructor(message = 'LLM API key is required') {
    super(message)
    this.name = 'LlmApiKeyMissingError'
  }
}

export interface LlmOptions {
  /** 사용자별 API 키 (필수). 없으면 LlmApiKeyMissingError. */
  apiKey: string
  /** Anthropic 호환 엔드포인트. 미설정 시 DEFAULT_BASE_URL. */
  baseUrl?: string | null
  /** 모델 ID. 미설정 시 DEFAULT_MODEL. */
  model?: string | null
  maxTokens?: number
  temperature?: number
}

export async function sendMessage(
  systemPrompt: string,
  userMessage: string,
  options: LlmOptions
): Promise<string> {
  const { apiKey, baseUrl, model, maxTokens = 1024, temperature = 0.7 } = options

  if (!apiKey) {
    throw new LlmApiKeyMissingError()
  }

  // 호출마다 새 클라이언트 생성 (사용자별 자격증명 격리)
  const client = new Anthropic({
    apiKey,
    baseURL: baseUrl || DEFAULT_BASE_URL,
    // Z.ai 엔드포인트는 Authorization: Bearer 인증을 권장한다. SDK 기본값인
    // x-api-key(apiKey)와 함께 Bearer 헤더도 실어 두 인증 스킴 모두에 대응한다
    // (동일 키라 무해 — 서버가 검증하는 쪽이 통과). 401 회피용.
    defaultHeaders: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  const response = await client.messages.create({
    model: model || DEFAULT_MODEL,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  })

  const textContent = response.content.find((block) => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from LLM')
  }

  return textContent.text
}
