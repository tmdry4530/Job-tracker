-- Job Application Tracker - User Plans
-- Created: 2026-01-11
-- Feature: Free and Premium plan system

-- ============================================
-- USER_PLANS TABLE
-- ============================================
CREATE TABLE user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'premium')),
  application_limit INTEGER NOT NULL DEFAULT 100,
  -- Premium 구독 정보 (미래 결제 연동용)
  premium_started_at TIMESTAMPTZ,
  premium_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for user lookup
CREATE INDEX idx_user_plans_user_id ON user_plans(user_id);

-- Apply updated_at trigger
CREATE TRIGGER update_user_plans_updated_at
  BEFORE UPDATE ON user_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 플랜만 조회 가능
CREATE POLICY "Users can view own plan"
  ON user_plans FOR SELECT
  USING (auth.uid() = user_id);

-- 시스템만 플랜 생성/수정 가능 (service role)
CREATE POLICY "Service role can manage plans"
  ON user_plans FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- FUNCTION: 신규 사용자에게 자동으로 무료 플랜 생성
-- ============================================
CREATE OR REPLACE FUNCTION create_user_plan()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan_type, application_limit)
  VALUES (NEW.id, 'free', 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 새 사용자 생성 시 트리거
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_plan();

-- ============================================
-- FUNCTION: 지원 개수 제한 확인
-- ============================================
CREATE OR REPLACE FUNCTION check_application_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_plan RECORD;
  current_count INTEGER;
BEGIN
  -- 사용자 플랜 조회
  SELECT * INTO user_plan FROM user_plans WHERE user_id = NEW.user_id;

  -- 플랜이 없으면 기본 제한 적용
  IF user_plan IS NULL THEN
    user_plan.application_limit := 100;
    user_plan.plan_type := 'free';
  END IF;

  -- Premium은 무제한
  IF user_plan.plan_type = 'premium' THEN
    RETURN NEW;
  END IF;

  -- 현재 지원 개수 확인
  SELECT COUNT(*) INTO current_count
  FROM applications
  WHERE user_id = NEW.user_id;

  -- 제한 초과 시 에러
  IF current_count >= user_plan.application_limit THEN
    RAISE EXCEPTION 'Application limit reached. Please upgrade to Premium for unlimited applications.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 지원 추가 시 제한 확인 트리거
CREATE TRIGGER check_application_limit_trigger
  BEFORE INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION check_application_limit();
