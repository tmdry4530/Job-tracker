import Anthropic from '@anthropic-ai/sdk'

let anthropicClient: Anthropic | null = null

export function getClaudeClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.CLAUDE_API_KEY

    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is not configured')
    }

    anthropicClient = new Anthropic({
      apiKey,
    })
  }

  return anthropicClient
}

export interface ClaudeOptions {
  maxTokens?: number
  temperature?: number
  model?: string
}

export async function sendMessage(
  systemPrompt: string,
  userMessage: string,
  options: ClaudeOptions = {}
): Promise<string> {
  const client = getClaudeClient()

  const {
    maxTokens = 1024,
    temperature = 0.7,
    // 모델 ID는 env로 오버라이드(구형 ID 404 방지). 기본값은 현행 Sonnet
    model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
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
    throw new Error('No text response from Claude')
  }

  return textContent.text
}
