-- Job Application Tracker Initial Schema
-- Created: 2026-01-04
-- Story: 1.3 Supabase Schema & RLS Setup

-- ============================================
-- APPLICATIONS TABLE
-- ============================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('wanted', 'saramin')),
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  source_url TEXT NOT NULL,
  jd_content TEXT,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'document_passed', 'interview', 'accepted', 'rejected')),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint to prevent duplicates
  UNIQUE(user_id, source_url)
);

-- Indexes for performance
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_platform ON applications(platform);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_applied_at ON applications(applied_at DESC);

-- ============================================
-- JD_SUMMARIES TABLE
-- ============================================
CREATE TABLE jd_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_jd_summaries_application_id ON jd_summaries(application_id);
CREATE INDEX idx_jd_summaries_user_id ON jd_summaries(user_id);

-- ============================================
-- INTERVIEW_QUESTIONS TABLE
-- ============================================
CREATE TABLE interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  question TEXT NOT NULL,
  category TEXT CHECK (category IN ('technical', 'experience', 'situational', 'general')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_interview_questions_application_id ON interview_questions(application_id);
CREATE INDEX idx_interview_questions_user_id ON interview_questions(user_id);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to applications
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to jd_summaries
CREATE TRIGGER update_jd_summaries_updated_at
  BEFORE UPDATE ON jd_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
