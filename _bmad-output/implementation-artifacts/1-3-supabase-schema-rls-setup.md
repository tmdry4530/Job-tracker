# Story 1.3: Supabase 스키마 및 RLS 설정

Status: done

## Story

As a **개발자**,
I want **Supabase에 데이터베이스 스키마와 보안 정책을 설정하여**,
so that **지원 공고 데이터를 안전하게 저장하고 사용자별 데이터 격리를 보장할 수 있다**.

## Acceptance Criteria

1. **Supabase 프로젝트 연동**
   - Given Supabase 프로젝트가 생성되었을 때
   - When 환경변수를 설정하면
   - Then NEXT_PUBLIC_SUPABASE_URL이 apps/web/.env.local에 설정된다
   - And NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정된다
   - And Supabase CLI 설정이 완료된다

2. **applications 테이블 생성**
   - Given Supabase 연동이 완료되었을 때
   - When 스키마 마이그레이션을 실행하면
   - Then applications 테이블이 생성된다
   - And id, user_id, company_name, position, platform, status, applied_at, source_url, jd_content, created_at, updated_at 컬럼이 생성된다

3. **jd_summaries 테이블 생성**
   - Given applications 테이블이 생성되었을 때
   - When 마이그레이션을 실행하면
   - Then jd_summaries 테이블이 생성된다
   - And application_id 외래키로 applications 테이블과 연결된다

4. **interview_questions 테이블 생성**
   - Given jd_summaries 테이블이 생성되었을 때
   - When 마이그레이션을 실행하면
   - Then interview_questions 테이블이 생성된다
   - And application_id 외래키로 applications 테이블과 연결된다

5. **RLS (Row Level Security) 정책 적용**
   - Given 모든 테이블이 생성되었을 때
   - When RLS 정책을 적용하면
   - Then 각 테이블에 `auth.uid() = user_id` 정책이 적용된다
   - And 사용자는 본인 데이터만 CRUD 가능하다
   - And 인증되지 않은 요청은 차단된다

## Tasks / Subtasks

- [x] Task 1: Supabase 프로젝트 설정 및 환경변수 구성 (AC: #1)
  - [x] 1.1 supabase/ 디렉토리 생성
  - [x] 1.2 supabase/config.toml 생성 (Supabase CLI 설정)
  - [x] 1.3 apps/web/.env.local 생성 (Supabase URL, Anon Key)
  - [x] 1.4 환경변수 검증 (연결 테스트)

- [x] Task 2: 데이터베이스 스키마 마이그레이션 생성 (AC: #2, #3, #4)
  - [x] 2.1 supabase/migrations/ 디렉토리 생성
  - [x] 2.2 00001_initial_schema.sql 작성 (applications 테이블)
  - [x] 2.3 00001_initial_schema.sql에 jd_summaries 테이블 추가
  - [x] 2.4 00001_initial_schema.sql에 interview_questions 테이블 추가
  - [x] 2.5 인덱스 생성 (user_id, platform, status 등)

- [x] Task 3: RLS 정책 설정 (AC: #5)
  - [x] 3.1 applications 테이블 RLS 활성화
  - [x] 3.2 applications 테이블 SELECT/INSERT/UPDATE/DELETE 정책 생성
  - [x] 3.3 jd_summaries 테이블 RLS 활성화 및 정책 생성
  - [x] 3.4 interview_questions 테이블 RLS 활성화 및 정책 생성

- [x] Task 4: Supabase 클라이언트 설정 (Dashboard 연동)
  - [x] 4.1 apps/web/src/lib/supabase/client.ts 생성 (브라우저용)
  - [x] 4.2 apps/web/src/lib/supabase/server.ts 생성 (서버 컴포넌트용)
  - [x] 4.3 Database 타입 정의 파일 생성 (packages/shared/src/types/database.ts)

- [x] Task 5: 검증 및 시드 데이터 (Optional)
  - [x] 5.1 마이그레이션 실행 검증 (로컬 또는 원격)
  - [x] 5.2 RLS 정책 테스트 (인증/비인증 요청)
  - [x] 5.3 supabase/seed.sql 생성 (테스트 데이터, Optional)

## Dev Notes

### Critical Technical Requirements

**🚨 SECURITY: RLS (Row Level Security) 필수**

모든 테이블에 RLS를 활성화하고 `auth.uid() = user_id` 정책을 적용해야 합니다 (NFR-S5).

```sql
-- RLS 정책 패턴
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own applications"
  ON applications FOR ALL
  USING (auth.uid() = user_id);
```

### Database Schema (Architecture 문서 기반)

**applications 테이블:**
```sql
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
```

**jd_summaries 테이블:**
```sql
CREATE TABLE jd_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_jd_summaries_application_id ON jd_summaries(application_id);
```

**interview_questions 테이블:**
```sql
CREATE TABLE interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  question TEXT NOT NULL,
  category TEXT CHECK (category IN ('technical', 'experience', 'situational', 'general')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_interview_questions_application_id ON interview_questions(application_id);
```

### Supabase CLI Configuration

**supabase/config.toml:**
```toml
# A string used to distinguish different Supabase projects on the same host
project_id = "job-application-tracker"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323
api_url = "http://localhost"

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000"]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true
```

### Supabase Client Setup

**apps/web/src/lib/supabase/client.ts (브라우저용):**
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@shared/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**apps/web/src/lib/supabase/server.ts (서버 컴포넌트용):**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@shared/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 쿠키 설정 불가
          }
        },
      },
    }
  )
}
```

### Environment Variables

**apps/web/.env.local (생성 필요):**
```bash
# Supabase - 실제 프로젝트 값으로 교체 필요
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 이전 스토리에서 설정됨
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Dependencies to Install

```bash
# apps/web에 Supabase 클라이언트 설치
pnpm --filter web add @supabase/supabase-js @supabase/ssr
```

### Previous Story Intelligence

**Story 1.1에서 학습한 내용:**
- pnpm workspace 구조 정상 작동
- tsconfig.base.json extends 패턴 확립됨
- packages/shared 패키지 존재 → 타입 정의 위치로 활용

**Story 1.2에서 학습한 내용:**
- apps/web/src/lib/ 디렉토리 패턴 확립됨 (utils.ts 존재)
- .env.example 템플릿 생성됨 → .env.local 생성 시 참조
- 환경변수 패턴: NEXT_PUBLIC_* (클라이언트 노출)
- src/types/ 디렉토리 존재 → 로컬 타입 정의용
- ESLint, TypeScript strict mode 통과 필수

### Project Structure Notes

**Target Files to Create:**
```
project-root/
├── supabase/
│   ├── config.toml
│   ├── seed.sql                    # Optional
│   └── migrations/
│       └── 00001_initial_schema.sql
├── apps/web/
│   ├── .env.local                  # 신규 생성
│   └── src/lib/supabase/
│       ├── client.ts               # 브라우저용
│       └── server.ts               # 서버 컴포넌트용
└── packages/shared/src/types/
    └── database.ts                 # Supabase 타입 정의
```

### Type Definitions

**packages/shared/src/types/database.ts:**
```typescript
export type Platform = 'wanted' | 'saramin'

export type ApplicationStatus =
  | 'applied'
  | 'document_passed'
  | 'interview'
  | 'accepted'
  | 'rejected'

export type QuestionCategory =
  | 'technical'
  | 'experience'
  | 'situational'
  | 'general'

export interface Database {
  public: {
    Tables: {
      applications: {
        Row: {
          id: string
          user_id: string
          platform: Platform
          company_name: string
          position: string
          source_url: string
          jd_content: string | null
          status: ApplicationStatus
          applied_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['applications']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['applications']['Insert']>
      }
      jd_summaries: {
        Row: {
          id: string
          application_id: string
          user_id: string
          summary: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['jd_summaries']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['jd_summaries']['Insert']>
      }
      interview_questions: {
        Row: {
          id: string
          application_id: string
          user_id: string
          question: string
          category: QuestionCategory | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['interview_questions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['interview_questions']['Insert']>
      }
    }
  }
}
```

### Anti-Patterns (금지)

```sql
-- ❌ RLS 없이 테이블 생성 금지
CREATE TABLE applications (...);

-- ✅ RLS 필수 적용
CREATE TABLE applications (...);
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON applications FOR ALL USING (auth.uid() = user_id);
```

```typescript
// ❌ 환경변수 하드코딩 금지
const supabase = createClient('https://xxx.supabase.co', 'xxx')

// ✅ 환경변수 사용
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

```typescript
// ❌ any 타입 사용 금지
const { data } = await supabase.from('applications').select('*')

// ✅ Database 타입 사용
import type { Database } from '@shared/types/database'
const { data } = await supabase.from('applications').select('*')
// data는 자동으로 타입 추론됨
```

### Commands Reference

```bash
# Supabase CLI 설치 (글로벌)
npm install -g supabase

# 로컬 Supabase 시작 (Docker 필요)
supabase start

# 마이그레이션 생성
supabase migration new initial_schema

# 마이그레이션 실행 (로컬)
supabase db push

# 원격 DB에 마이그레이션 적용
supabase db push --linked

# 타입 생성 (Supabase CLI)
supabase gen types typescript --local > packages/shared/src/types/supabase.ts
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication-&-Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure-&-Boundaries]
- [Source: _bmad-output/project-context.md#Security-Rules]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.3]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- Supabase CLI configuration (config.toml) created for local development
- Database schema with 3 tables: applications, jd_summaries, interview_questions
- All tables have proper indexes for performance (user_id, platform, status, applied_at)
- RLS policies applied to all tables with `auth.uid() = user_id` pattern (NFR-S5 compliant)
- Separate CRUD policies for each table (SELECT, INSERT, UPDATE, DELETE)
- Supabase client setup for both browser (client.ts) and server components (server.ts)
- TypeScript Database types exported from @shared package
- Updated tailwind.config.js with shadcn/ui color variables (fixed build error)
- Build and lint passing successfully
- Seed SQL file created for development testing

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-04 | Story created with comprehensive context | create-story workflow |
| 2026-01-04 | Implementation completed | Claude Opus 4.5 |

### File List

**Created:**
- supabase/config.toml
- supabase/migrations/00001_initial_schema.sql
- supabase/migrations/00002_rls_policies.sql
- supabase/seed.sql
- apps/web/.env.local
- apps/web/src/lib/supabase/client.ts
- apps/web/src/lib/supabase/server.ts
- packages/shared/src/index.ts
- packages/shared/src/types/database.ts

**Modified:**
- apps/web/tsconfig.json (added @shared/* path mapping)
- apps/web/tailwind.config.js (added shadcn/ui color variables)
