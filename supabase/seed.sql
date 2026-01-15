-- Seed Data for Development/Testing
-- This file is OPTIONAL and should only be used for local development
-- DO NOT use in production

-- Note: To use this seed data, you need to:
-- 1. Create a test user in Supabase Auth (via supabase studio or auth API)
-- 2. Replace 'YOUR_TEST_USER_UUID' with the actual user ID

-- Example seed data (commented out - uncomment and modify for use):
/*
INSERT INTO applications (user_id, platform, company_name, position, source_url, jd_content, status, saved_at, deadline)
VALUES
  ('YOUR_TEST_USER_UUID', 'wanted', '테스트 회사 A', '프론트엔드 개발자', 'https://www.wanted.co.kr/wd/12345', '테스트 JD 내용입니다.', 'saved', now(), now() + interval '14 days'),
  ('YOUR_TEST_USER_UUID', 'saramin', '테스트 회사 B', '백엔드 개발자', 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=12345', 'Python/Django 기반 백엔드 개발', 'applied', now() - interval '3 days', now() + interval '7 days'),
  ('YOUR_TEST_USER_UUID', 'wanted', '테스트 회사 C', '풀스택 개발자', 'https://www.wanted.co.kr/wd/67890', 'Next.js + Node.js 풀스택 개발', 'closed', now() - interval '7 days', now() - interval '1 day');
*/

-- Verify tables exist
SELECT 'applications' as table_name, count(*) as row_count FROM applications
UNION ALL
SELECT 'jd_summaries', count(*) FROM jd_summaries
UNION ALL
SELECT 'interview_questions', count(*) FROM interview_questions;
