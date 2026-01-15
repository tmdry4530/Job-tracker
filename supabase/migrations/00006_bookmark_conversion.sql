-- Migration: 지원내역 → 북마크 전환
-- 기존 applications 테이블을 북마크 개념으로 전환

-- 1. 백업 컬럼 추가 (롤백용)
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS legacy_status TEXT,
ADD COLUMN IF NOT EXISTS legacy_applied_at TIMESTAMPTZ;

-- 2. 기존 데이터 백업
UPDATE applications
SET legacy_status = status,
    legacy_applied_at = applied_at
WHERE legacy_status IS NULL;

-- 3. 새 컬럼 추가 (마감일, saved_at)
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ;

-- 4. applied_at 데이터를 saved_at으로 복사
UPDATE applications
SET saved_at = COALESCE(applied_at, created_at)
WHERE saved_at IS NULL;

-- 5. is_bookmarked → is_favorite 리네임
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'is_bookmarked'
  ) THEN
    ALTER TABLE applications RENAME COLUMN is_bookmarked TO is_favorite;
  END IF;
END $$;

-- 6. 기존 상태값을 새 상태값으로 변환
UPDATE applications
SET status = CASE
  WHEN status IN ('applied', 'document_passed', 'interview') THEN 'applied'
  WHEN status IN ('accepted') THEN 'applied'
  WHEN status IN ('rejected') THEN 'closed'
  ELSE 'saved'
END
WHERE status NOT IN ('saved', 'applied', 'closed');

-- 7. 인덱스 재생성
DROP INDEX IF EXISTS idx_applications_applied_at;
CREATE INDEX IF NOT EXISTS idx_applications_saved_at ON applications(saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_deadline ON applications(deadline);

-- 8. 기존 applied_at 컬럼 삭제 (saved_at으로 대체됨)
-- 주의: 롤백이 필요한 경우를 위해 주석 처리
-- ALTER TABLE applications DROP COLUMN IF EXISTS applied_at;

COMMENT ON TABLE applications IS '북마크/스크랩 공고 테이블 (구 지원내역)';
COMMENT ON COLUMN applications.status IS '북마크 상태: saved(저장됨), applied(지원함), closed(마감됨)';
COMMENT ON COLUMN applications.saved_at IS '북마크 저장 일시';
COMMENT ON COLUMN applications.deadline IS '공고 마감일';
COMMENT ON COLUMN applications.is_favorite IS '즐겨찾기 여부';
