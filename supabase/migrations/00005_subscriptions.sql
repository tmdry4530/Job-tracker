-- 구독 및 결제 내역 테이블
-- 토스페이먼츠 정기결제를 위한 스키마

-- 구독 상태 enum
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due');

-- 결제 상태 enum
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'refunded');

-- 구독 테이블
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_key TEXT NOT NULL,
  customer_key TEXT NOT NULL,
  card_company TEXT,
  card_number TEXT,
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- 결제 내역 테이블
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  payment_key TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  failed_reason TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX idx_payment_history_created_at ON payment_history(created_at DESC);

-- updated_at 트리거
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- 구독: 본인만 조회/수정 가능
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- 결제 내역: 본인만 조회 가능 (수정 불가)
CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment history"
  ON payment_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 구독 상태 변경 시 user_plans 테이블 업데이트 트리거
CREATE OR REPLACE FUNCTION sync_subscription_to_plan()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    -- 구독 활성화: Premium으로 업그레이드
    UPDATE user_plans
    SET
      plan_type = 'premium',
      application_limit = -1,
      premium_started_at = NEW.current_period_start,
      premium_expires_at = NEW.current_period_end,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.status IN ('cancelled', 'expired') THEN
    -- 구독 취소/만료: Free로 다운그레이드
    UPDATE user_plans
    SET
      plan_type = 'free',
      application_limit = 100,
      premium_expires_at = NULL,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_subscription_to_plan_trigger
  AFTER INSERT OR UPDATE OF status ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_to_plan();

-- 구독 만료 체크 함수 (크론잡으로 실행)
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE
    status = 'active'
    AND current_period_end < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
