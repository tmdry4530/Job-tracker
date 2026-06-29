-- Add jobkorea to platform check constraint
-- Created: 2026-01-16

-- Drop existing platform check constraint
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_platform_check;

-- Add updated platform check constraint including jobkorea
ALTER TABLE applications ADD CONSTRAINT applications_platform_check
  CHECK (platform IN ('wanted', 'saramin', 'jobkorea'));
