-- Row Level Security (RLS) Policies
-- Created: 2026-01-04
-- Story: 1.3 Supabase Schema & RLS Setup
-- Security: NFR-S5 - User data isolation

-- ============================================
-- APPLICATIONS TABLE RLS
-- ============================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can only view their own applications
CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT policy: Users can only insert their own applications
CREATE POLICY "Users can insert own applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Users can only update their own applications
CREATE POLICY "Users can update own applications"
  ON applications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy: Users can only delete their own applications
CREATE POLICY "Users can delete own applications"
  ON applications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- JD_SUMMARIES TABLE RLS
-- ============================================
ALTER TABLE jd_summaries ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "Users can view own jd_summaries"
  ON jd_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT policy
CREATE POLICY "Users can insert own jd_summaries"
  ON jd_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
CREATE POLICY "Users can update own jd_summaries"
  ON jd_summaries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy
CREATE POLICY "Users can delete own jd_summaries"
  ON jd_summaries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- INTERVIEW_QUESTIONS TABLE RLS
-- ============================================
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "Users can view own interview_questions"
  ON interview_questions FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT policy
CREATE POLICY "Users can insert own interview_questions"
  ON interview_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
CREATE POLICY "Users can update own interview_questions"
  ON interview_questions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy
CREATE POLICY "Users can delete own interview_questions"
  ON interview_questions FOR DELETE
  USING (auth.uid() = user_id);
