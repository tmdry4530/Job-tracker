-- ============================================
-- ADD ANSWER COLUMN TO INTERVIEW_QUESTIONS
-- 면접 예상 질문에 모범 답변 필드 추가
-- ============================================

ALTER TABLE interview_questions
ADD COLUMN answer TEXT;

COMMENT ON COLUMN interview_questions.answer IS '면접 질문에 대한 AI 생성 모범 답변 가이드';
