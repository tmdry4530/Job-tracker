export {
  sendMessage,
  LlmApiKeyMissingError,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
} from './client'
export type { LlmOptions } from './client'
export {
  JD_SUMMARY_SYSTEM_PROMPT,
  INTERVIEW_QUESTIONS_SYSTEM_PROMPT,
  createJdSummaryUserPrompt,
  createInterviewQuestionsUserPrompt,
} from './prompts'
