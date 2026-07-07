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
-- BYOK 무료 전환 정리: 결제/플랜 제한 관련 트리거·함수 제거
-- 테이블 정의(user_plans/subscriptions/payment_history)는 마이그레이션 안전을 위해 유지하되,
-- 아래 트리거/함수는 제거해 애플리케이션 생성이 무제한이 되도록 한다(멱등 DROP).
-- ============================================================

-- 북마크 개수 제한 트리거/함수 제거 → 애플리케이션 생성 무제한
DROP TRIGGER IF EXISTS check_application_limit_trigger ON applications;
DROP FUNCTION IF EXISTS check_application_limit();

-- 구독 상태 → 플랜 동기화 트리거/함수 제거 (유료 개념 없음)
DROP TRIGGER IF EXISTS sync_subscription_to_plan_trigger ON subscriptions;
DROP FUNCTION IF EXISTS sync_subscription_to_plan();

-- 만료 구독 정리 함수 제거 (더 이상 구독 없음)
DROP FUNCTION IF EXISTS check_expired_subscriptions();

-- 신규 사용자 자동 플랜 생성 트리거/함수 제거 (플랜 제한 없음)
DROP TRIGGER IF EXISTS on_user_created ON users;
DROP FUNCTION IF EXISTS create_user_plan();
