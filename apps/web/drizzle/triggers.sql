-- ============================================================
-- 비즈니스 로직 트리거/함수 (Supabase auth.users → users 전환)
-- drizzle-kit가 생성하지 않는 부분. migrate 스크립트가 테이블 생성 후 실행.
-- 모두 멱등(CREATE OR REPLACE / DROP IF EXISTS)하게 작성.
-- ============================================================

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jd_summaries_updated_at ON jd_summaries;
CREATE TRIGGER update_jd_summaries_updated_at
  BEFORE UPDATE ON jd_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_plans_updated_at ON user_plans;
CREATE TRIGGER update_user_plans_updated_at
  BEFORE UPDATE ON user_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 신규 사용자 → 무료 플랜 자동 생성 (구: auth.users 트리거)
-- ============================================================
CREATE OR REPLACE FUNCTION create_user_plan()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan_type, application_limit)
  VALUES (NEW.id, 'free', 100)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_plan();

-- ============================================================
-- 북마크 개수 제한 확인 (free 플랜 100개)
-- ============================================================
CREATE OR REPLACE FUNCTION check_application_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_plan RECORD;
  current_count INTEGER;
BEGIN
  SELECT * INTO user_plan FROM user_plans WHERE user_id = NEW.user_id;

  IF user_plan IS NULL THEN
    user_plan.application_limit := 100;
    user_plan.plan_type := 'free';
  END IF;

  IF user_plan.plan_type = 'premium' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM applications
  WHERE user_id = NEW.user_id;

  IF current_count >= user_plan.application_limit THEN
    RAISE EXCEPTION 'Application limit reached. Please upgrade to Premium for unlimited applications.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_application_limit_trigger ON applications;
CREATE TRIGGER check_application_limit_trigger
  BEFORE INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION check_application_limit();

-- ============================================================
-- 구독 상태 변경 → user_plans 동기화
-- ============================================================
CREATE OR REPLACE FUNCTION sync_subscription_to_plan()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE user_plans
    SET plan_type = 'premium',
        application_limit = -1,
        premium_started_at = NEW.current_period_start,
        premium_expires_at = NEW.current_period_end,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.status IN ('cancelled', 'expired') THEN
    UPDATE user_plans
    SET plan_type = 'free',
        application_limit = 100,
        premium_expires_at = NULL,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_subscription_to_plan_trigger ON subscriptions;
CREATE TRIGGER sync_subscription_to_plan_trigger
  AFTER INSERT OR UPDATE OF status ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION sync_subscription_to_plan();

-- ============================================================
-- 만료 구독 정리 (크론잡용)
-- ============================================================
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND current_period_end < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
