export { getLlmClient, sendMessage } from './client'
export type { LlmOptions } from './client'
export {
  JD_SUMMARY_SYSTEM_PROMPT,
  INTERVIEW_QUESTIONS_SYSTEM_PROMPT,
  createJdSummaryUserPrompt,
  createInterviewQuestionsUserPrompt,
} from './prompts'
