import Anthropic from '@anthropic-ai/sdk'

/**
 * LLM 클라이언트 (GLM via Z.ai Anthropic 호환 엔드포인트)
 *
 * Z.ai가 Anthropic Messages 프로토콜과 호환되는 엔드포인트를 제공하므로
 * 기존 @anthropic-ai/sdk 코드를 그대로 재사용하고 baseURL/키/모델만 교체한다.
 *  - GLM_API_KEY  : Z.ai(또는 호환 게이트웨이) API 키 (필수)
 *  - GLM_BASE_URL : Anthropic 호환 엔드포인트. 기본 https://api.z.ai/api/anthropic
 *                   (중국 Zhipu 플랫폼은 https://open.bigmodel.cn/api/anthropic)
 *  - GLM_MODEL    : 모델 ID. 기본 glm-4.6 (플래그십은 glm-5.2, 저가형은 glm-4.5-flash)
 */

const DEFAULT_BASE_URL = 'https://api.z.ai/api/anthropic'
const DEFAULT_MODEL = 'glm-4.6'

let llmClient: Anthropic | null = null

export function getLlmClient(): Anthropic {
  if (!llmClient) {
    const apiKey = process.env.GLM_API_KEY

    if (!apiKey) {
      throw new Error('GLM_API_KEY is not configured')
    }

    llmClient = new Anthropic({
      apiKey,
      baseURL: process.env.GLM_BASE_URL || DEFAULT_BASE_URL,
      // Z.ai 엔드포인트는 Authorization: Bearer 인증을 권장한다. SDK 기본값인
      // x-api-key(apiKey)와 함께 Bearer 헤더도 실어 두 인증 스킴 모두에 대응한다
      // (동일 키라 무해 — 서버가 검증하는 쪽이 통과). 401 회피용.
      defaultHeaders: {
        Authorization: `Bearer ${apiKey}`,
      },
    })
  }

  return llmClient
}

export interface LlmOptions {
  maxTokens?: number
  temperature?: number
  model?: string
}

export async function sendMessage(
  systemPrompt: string,
  userMessage: string,
  options: LlmOptions = {}
): Promise<string> {
  const client = getLlmClient()

  const {
    maxTokens = 1024,
    temperature = 0.7,
    // 모델 ID는 env로 오버라이드. 미설정 시 GLM 현행 기본 모델 사용
    model = process.env.GLM_MODEL || DEFAULT_MODEL,
  } = options

  const response = await client.messages.create({
    model,
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
