---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - prd.md
  - product-brief-job-tracker-boilerplate-2026-01-03.md
  - GETTING_STARTED.md
workflowType: 'architecture'
project_name: 'job-tracker-boilerplate'
user_name: 'Wjdtm'
date: '2026-01-03'
lastStep: 8
status: 'complete'
completedAt: '2026-01-03'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (21개):**
- **사용자 인증 (4)**: 이메일 로그인, Extension-Dashboard 세션 공유
- **데이터 수집 (4)**: 원티드/사람인 파싱, 백엔드 동기화, 새 지원 감지
- **지원 관리 (6)**: 목록, 검색, 필터, 상태 변경, 삭제
- **AI 분석 (4)**: JD 요약, 면접 예상 질문 생성/조회
- **공고 상세 (3)**: 상세 정보, 원본 JD, 원본 URL 링크

**Non-Functional Requirements (17개):**
- **Performance**: 페이지 2초, 검색 500ms, JD 요약 5초, 파싱 3초
- **Security**: HTTPS, 비밀번호 해시, API 인증, RLS
- **Reliability**: 원티드 95%+, 사람인 90%+, 99.5% uptime
- **Integration**: Manifest V3, 세션 공유, Realtime 동기화, graceful degradation

**Scale & Complexity:**
- Primary domain: Full-stack (Browser Extension + Web Dashboard + AI API)
- Complexity level: Medium
- Estimated architectural components: 5개

### Technical Constraints & Dependencies

| 제약 | 영향 |
|------|------|
| Chrome Manifest V3 | Service Worker 기반, 제한된 API |
| Supabase Auth | Extension과 Dashboard 간 토큰 공유 필요 |
| Claude API | 서버사이드 전용, 비용 관리 필요 |
| DOM 파싱 의존성 | 플랫폼 변경 시 파서 업데이트 필요 |

### Cross-Cutting Concerns Identified

| 관심사 | 영향 범위 |
|--------|----------|
| **인증/세션 관리** | Extension, Dashboard, API 모두 |
| **에러 핸들링** | 파싱 실패, API 오류, 네트워크 문제 |
| **데이터 동기화** | Extension→Supabase→Dashboard Realtime |
| **캐싱 전략** | JD 요약 캐싱으로 Claude API 비용 절감 |

## Starter Template Evaluation

### Primary Technology Domain

**Full-stack Hybrid (Extension + Web + AI)**

이 프로젝트는 세 개의 개별 앱과 공유 패키지를 포함하는 Monorepo 구조입니다.

### Starter Options Considered

| 옵션 | 장점 | 단점 | 결정 |
|------|------|------|------|
| **T3 Stack** | 풀스택 통합 | Extension 미지원 | ❌ |
| **Turborepo** | 빌드 캐싱 | 추가 복잡도 | ❌ MVP 불필요 |
| **pnpm workspace** | 심플, 충분한 기능 | 수동 설정 | ✅ 선택 |

### Selected Starter: pnpm Workspace + Plasmo + Next.js 14

**Rationale for Selection:**
- PRD에서 이미 검증된 기술 스택
- Plasmo: Chrome Extension 개발에 최적화된 프레임워크
- Next.js 14: 안정적인 App Router, Supabase와 좋은 통합
- pnpm workspace: 개인 프로젝트에 적합한 심플한 모노레포

**Initialization Commands:**

```bash
# 1. 프로젝트 루트 초기화
mkdir job-application-tracker && cd job-application-tracker
pnpm init

# 2. pnpm-workspace.yaml 생성
echo "packages:
  - 'apps/*'
  - 'packages/*'" > pnpm-workspace.yaml

# 3. Extension 앱 생성
mkdir -p apps && cd apps
pnpm create plasmo@latest extension --with-tailwindcss

# 4. Web Dashboard 앱 생성
pnpm create next-app@14 web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 5. Shared 패키지 생성
cd ../packages && mkdir shared && cd shared
pnpm init
```

### Architectural Decisions Provided by Starters

**Language & Runtime:**
- TypeScript strict mode (모든 앱/패키지)
- Node.js 18+ (Supabase 요구사항)

**Styling Solution:**
- Tailwind CSS 3.x (Extension + Web 모두)

**Build Tooling:**
- Plasmo: Parcel 기반 빌드
- Next.js: Turbopack (dev) / Webpack (prod)

**Testing Framework:**
- 별도 설정 필요 (Vitest 권장)

**Code Organization:**

```
/
├── apps/
│   ├── extension/     # Plasmo 크롬 익스텐션
│   │   ├── src/
│   │   │   ├── contents/      # Content Scripts
│   │   │   ├── background/    # Service Worker
│   │   │   └── popup/         # Popup UI
│   │   └── package.json
│   └── web/           # Next.js 대시보드
│       ├── src/
│       │   ├── app/           # App Router
│       │   ├── components/    # UI 컴포넌트
│       │   └── lib/           # 유틸리티
│       └── package.json
├── packages/
│   └── shared/        # 공유 타입, 유틸
│       ├── src/
│       │   ├── types/         # 공유 타입 정의
│       │   └── utils/         # 공유 유틸리티
│       └── package.json
├── pnpm-workspace.yaml
└── package.json
```

**Development Experience:**
- Hot Reload: Plasmo (Extension) + Next.js (Web)
- TypeScript: 전체 프로젝트 타입 안전성
- ESLint + Prettier: 코드 일관성

### Security Considerations

**React 19 취약점 (CVE-2025-55182):**
- CVSS 10.0 RCE 취약점 - React Server Components 영향
- Next.js 15/16 사용 시 취약

**결정:**
- **Next.js 14.2.x 유지** (React 18 기반, 취약점 없음)
- 향후 Next.js 15 업그레이드 시 React 19.2.3+ 필수 확인
- package.json에 React 버전 명시적 고정 권장

**권장 NFR 추가:**
- **NFR-S6**: React/Next.js 보안 패치 모니터링 및 신속 적용

### Version Pinning Strategy

| 패키지 | 버전 | 이유 |
|--------|------|------|
| next | ^14.2.35 | React 18 기반, CVE-2025-55182 회피 |
| react | ^18.2.0 | 안정 버전, 취약점 없음 |
| @supabase/supabase-js | ^2.89.0 | 최신 안정 버전 |
| plasmo | latest | 활발한 유지보수, 항상 최신 권장 |

**Note:** 프로젝트 초기화는 첫 번째 구현 스토리가 되어야 합니다.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Database: Supabase PostgreSQL
- Auth: Supabase Auth + Extension 세션 공유
- API Pattern: Supabase Direct + Next.js API Routes

**Important Decisions (Shape Architecture):**
- State Management: React Query + useState
- UI Components: shadcn/ui
- Validation: Zod

**Deferred Decisions (Post-MVP):**
- 고급 캐싱 (Redis)
- 모니터링/로깅 (Sentry, LogRocket)
- 스케일링 전략

### Data Architecture

| 결정 | 선택 | 버전 | 근거 |
|------|------|------|------|
| **Database** | Supabase PostgreSQL | - | PRD 명시, 무료 티어 충분 |
| **ORM/Client** | Supabase JS Client | ^2.89.0 | 타입 안전, Realtime 지원 |
| **Type Generation** | Supabase CLI | - | DB 스키마 → TypeScript 자동 생성 |
| **Caching** | jd_summaries 테이블 | - | Claude API 호출 최소화, 비용 절감 |
| **Migration** | Supabase Migration | - | 기본 제공, 버전 관리 가능 |

**Data Model 개요:**

```sql
-- users: Supabase Auth 기본 제공

-- applications: 지원 공고
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  platform TEXT NOT NULL, -- 'wanted' | 'saramin'
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  original_url TEXT NOT NULL,
  jd_content TEXT,
  status TEXT DEFAULT 'applied',
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- jd_summaries: JD 요약 캐시
CREATE TABLE jd_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications UNIQUE NOT NULL,
  summary TEXT NOT NULL,
  interview_questions JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 정책
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE jd_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own applications"
  ON applications FOR ALL USING (auth.uid() = user_id);
```

### Authentication & Security

| 결정 | 선택 | 근거 |
|------|------|------|
| **Auth Provider** | Supabase Auth | 이메일/비밀번호, 무료, RLS 통합 |
| **Extension Auth** | Dashboard 세션 공유 | chrome.storage.local에 토큰 저장 |
| **RLS** | user_id 기반 | NFR-S5 충족, 데이터 격리 |
| **API 보안** | Supabase Auth 미들웨어 | 모든 API Route에서 세션 검증 |

**Extension ↔ Dashboard 인증 흐름:**

```
1. Dashboard에서 Supabase Auth 로그인
2. 로그인 성공 → access_token을 chrome.storage.local에 저장
3. Extension에서 chrome.storage.local에서 토큰 읽기
4. Extension이 Supabase Client에 토큰 설정
5. 이후 Extension ↔ Supabase 직접 통신
```

### API & Communication Patterns

| 결정 | 선택 | 근거 |
|------|------|------|
| **Extension → DB** | Supabase JS Client 직접 | 간단, RLS 자동 적용 |
| **Dashboard → DB** | Supabase JS Client 직접 | Server Components 지원 |
| **Dashboard → Claude** | Next.js API Routes | API 키 서버사이드 보호 |
| **Error Handling** | Zod + 표준 응답 | 타입 안전 검증, 일관된 에러 형식 |
| **Realtime** | Supabase Realtime | Extension 수집 → Dashboard 즉시 반영 |

**API 응답 표준:**

```typescript
// 성공
{ success: true, data: T }

// 실패
{ success: false, error: { code: string, message: string } }
```

### Frontend Architecture

| 결정 | 선택 | 버전 | 근거 |
|------|------|------|------|
| **State Management** | React Query | ^5.x | 서버 상태 관리, 캐싱, 자동 갱신 |
| **Local State** | useState/useReducer | React 18 | 간단한 UI 상태 |
| **UI Components** | shadcn/ui | - | Tailwind 호환, 복사 방식, 커스텀 용이 |
| **Validation** | Zod | ^3.x | 타입 추론 + 런타임 검증 |
| **Forms** | React Hook Form + Zod | ^7.x | 성능 최적화, Zod 통합 |

**컴포넌트 구조:**

```
src/
├── components/
│   ├── ui/           # shadcn/ui 기본 컴포넌트
│   ├── features/     # 기능별 컴포넌트 (ApplicationCard, JDSummary)
│   └── layouts/      # 레이아웃 컴포넌트
├── lib/
│   ├── supabase/     # Supabase 클라이언트
│   ├── queries/      # React Query 훅
│   └── validations/  # Zod 스키마
└── app/
    ├── (auth)/       # 인증 라우트
    ├── (dashboard)/  # 대시보드 라우트
    └── api/          # API Routes
```

### Infrastructure & Deployment

| 결정 | 선택 | 근거 |
|------|------|------|
| **Web Hosting** | Vercel | Next.js 최적화, 무료 티어 |
| **Database** | Supabase Cloud | 무료 티어, 관리형 |
| **Extension 배포** | Chrome Web Store | 표준 배포 경로 |
| **CI/CD** | GitHub Actions | Vercel 자동 배포 트리거 |
| **Monitoring** | Supabase Dashboard | MVP 충분, 추후 Sentry 고려 |

**배포 흐름:**

```
GitHub Push
    ↓
GitHub Actions (빌드 검증)
    ↓
Vercel (자동 배포)
    ↓
Production

Extension:
GitHub Push → 수동 빌드 → Chrome Web Store 업로드
```

### Decision Impact Analysis

**Implementation Sequence:**
1. Supabase 프로젝트 설정 + 스키마
2. Next.js 앱 초기화 + Supabase 연동
3. Plasmo Extension 초기화 + Auth 연동
4. 파서 구현 (원티드 → 사람인)
5. 대시보드 UI 구현
6. Claude API 통합

**Cross-Component Dependencies:**

| 의존성 | 영향 |
|--------|------|
| Supabase 스키마 | Extension, Dashboard 모두 의존 |
| Auth 토큰 공유 | Extension이 Dashboard 로그인에 의존 |
| shared 패키지 | 타입 정의는 모든 앱에서 사용 |

## Implementation Patterns & Consistency Rules

### Naming Patterns

#### Database Naming (Supabase)

| 항목 | 규칙 | 예시 |
|------|------|------|
| **테이블명** | snake_case, 복수형 | `applications`, `jd_summaries` |
| **컬럼명** | snake_case | `user_id`, `created_at`, `company_name` |
| **Foreign Key** | {referenced_table}_id | `user_id`, `application_id` |
| **인덱스** | idx_{table}_{column} | `idx_applications_user_id` |
| **Boolean** | is_/has_ prefix | `is_deleted`, `has_summary` |

#### API Naming (Next.js API Routes)

| 항목 | 규칙 | 예시 |
|------|------|------|
| **엔드포인트** | kebab-case, 복수형 | `/api/applications`, `/api/jd-summaries` |
| **Route Params** | [id] (Next.js 표준) | `/api/applications/[id]` |
| **Query Params** | camelCase | `?userId=xxx&status=applied` |
| **HTTP Methods** | 표준 REST | GET, POST, PATCH, DELETE |

#### Code Naming (TypeScript)

| 항목 | 규칙 | 예시 |
|------|------|------|
| **컴포넌트** | PascalCase | `ApplicationCard`, `JDSummary` |
| **파일명 (컴포넌트)** | PascalCase.tsx | `ApplicationCard.tsx` |
| **파일명 (유틸)** | camelCase.ts | `supabaseClient.ts` |
| **함수** | camelCase, 동사 시작 | `getApplications`, `parseWantedPage` |
| **변수** | camelCase | `userId`, `applicationList` |
| **상수** | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| **타입/인터페이스** | PascalCase, I- prefix 없음 | `Application`, `JDSummary` |
| **Enum** | PascalCase | `ApplicationStatus.Applied` |

### Structure Patterns

#### Project Organization

```
/
├── apps/
│   ├── extension/
│   │   ├── src/
│   │   │   ├── contents/           # Content Scripts
│   │   │   │   ├── wanted.ts       # 원티드 파서
│   │   │   │   └── saramin.ts      # 사람인 파서
│   │   │   ├── background/         # Service Worker
│   │   │   │   └── index.ts
│   │   │   ├── popup/              # Popup UI
│   │   │   │   └── index.tsx
│   │   │   └── lib/                # Extension 전용 유틸
│   │   ├── assets/                 # 정적 파일
│   │   └── package.json
│   │
│   └── web/
│       ├── src/
│       │   ├── app/                # App Router
│       │   │   ├── (auth)/         # 인증 그룹
│       │   │   │   ├── login/
│       │   │   │   └── signup/
│       │   │   ├── (dashboard)/    # 대시보드 그룹
│       │   │   │   ├── applications/
│       │   │   │   └── settings/
│       │   │   ├── api/            # API Routes
│       │   │   │   ├── applications/
│       │   │   │   └── ai/
│       │   │   └── layout.tsx
│       │   ├── components/
│       │   │   ├── ui/             # shadcn/ui
│       │   │   ├── features/       # 기능별
│       │   │   └── layouts/        # 레이아웃
│       │   ├── lib/
│       │   │   ├── supabase/       # Supabase 클라이언트
│       │   │   ├── queries/        # React Query 훅
│       │   │   └── validations/    # Zod 스키마
│       │   └── types/              # 로컬 타입
│       └── package.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types/              # 공유 타입
│       │   │   ├── application.ts
│       │   │   ├── user.ts
│       │   │   └── index.ts
│       │   ├── constants/          # 공유 상수
│       │   └── utils/              # 공유 유틸
│       └── package.json
│
└── supabase/
    ├── migrations/                 # DB 마이그레이션
    └── seed.sql                    # 시드 데이터
```

#### Test Organization

| 규칙 | 설명 |
|------|------|
| **위치** | 소스 파일과 코로케이션 |
| **명명** | `*.test.ts`, `*.test.tsx` |
| **E2E** | `apps/web/e2e/` (별도 폴더) |

```
src/
├── lib/
│   ├── supabaseClient.ts
│   └── supabaseClient.test.ts  # 코로케이션
└── components/
    ├── ApplicationCard.tsx
    └── ApplicationCard.test.tsx
```

### Format Patterns

#### API Response Format

**성공 응답:**
```typescript
{
  success: true,
  data: T
}
```

**에러 응답:**
```typescript
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'INTERNAL_ERROR',
    message: string,
    details?: Record<string, string[]>  // 필드별 에러
  }
}
```

**HTTP Status Codes:**
- 200: 성공
- 201: 생성 성공
- 400: 검증 실패
- 401: 인증 필요
- 403: 권한 없음
- 404: 리소스 없음
- 500: 서버 에러

#### Data Format

| 항목 | 규칙 |
|------|------|
| **JSON 필드** | camelCase (API ↔ Client) |
| **DB 필드** | snake_case |
| **날짜** | ISO 8601 (`2026-01-03T12:00:00Z`) |
| **Boolean** | `true`/`false` (문자열 아님) |
| **Null** | `null` (빈 문자열 아님) |
| **배열** | 빈 경우 `[]` (null 아님) |

### Communication Patterns

#### State Management (React Query)

```typescript
// Query Key 패턴
const queryKeys = {
  applications: {
    all: ['applications'] as const,
    list: (filters: Filters) => ['applications', 'list', filters] as const,
    detail: (id: string) => ['applications', 'detail', id] as const,
  },
  jdSummaries: {
    byApplication: (appId: string) => ['jdSummaries', appId] as const,
  },
};

// Query Hook 패턴
function useApplications(filters: Filters) {
  return useQuery({
    queryKey: queryKeys.applications.list(filters),
    queryFn: () => getApplications(filters),
  });
}
```

#### Extension ↔ Dashboard 메시징

```typescript
// 메시지 타입
type MessageType =
  | 'AUTH_TOKEN_UPDATED'
  | 'APPLICATION_SYNCED'
  | 'PARSE_COMPLETED'
  | 'PARSE_FAILED';

// 메시지 구조
interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: number;
}
```

### Process Patterns

#### Error Handling

```typescript
// 에러 바운더리: app/error.tsx (Next.js 표준)
// 로컬 에러: try-catch + toast notification

// 에러 로깅 패턴
function logError(error: Error, context?: Record<string, unknown>) {
  console.error('[Error]', error.message, context);
  // 추후 Sentry 통합 시 여기에 추가
}
```

#### Loading States

```typescript
// React Query 기본 제공 사용
const { data, isLoading, isError } = useApplications(filters);

// 컴포넌트 패턴
if (isLoading) return <Skeleton />;
if (isError) return <ErrorMessage />;
return <ApplicationList data={data} />;
```

### Enforcement Guidelines

**모든 AI 에이전트가 반드시 따라야 할 규칙:**

1. **shared 패키지 타입 사용**: `Application`, `JDSummary` 등 공유 타입은 `@shared/types`에서 import
2. **Zod 스키마 정의**: API 입력/출력은 반드시 Zod로 검증
3. **React Query 사용**: 서버 상태는 useState 대신 React Query
4. **표준 API 응답**: `{ success, data/error }` 형식 준수
5. **에러 코드 사용**: 문자열 메시지 대신 정의된 에러 코드

**Anti-Patterns (금지):**

```typescript
// ❌ 잘못된 예
const userData = await fetch('/api/user');  // 직접 fetch

// ✅ 올바른 예
const { data } = useUser();  // React Query 훅 사용
```

```typescript
// ❌ 잘못된 예
if (error) return { error: error.message };  // 비표준 응답

// ✅ 올바른 예
if (error) return { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } };
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
job-application-tracker/
├── README.md
├── package.json                    # 루트 워크스페이스 설정
├── pnpm-workspace.yaml             # pnpm 워크스페이스 정의
├── pnpm-lock.yaml
├── .gitignore
├── .env.example                    # 환경변수 템플릿
├── .github/
│   └── workflows/
│       ├── ci.yml                  # PR 빌드 검증
│       └── deploy.yml              # Vercel 배포 트리거
│
├── apps/
│   ├── extension/                  # Chrome Extension (Plasmo)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.js
│   │   ├── .env.local              # PLASMO_PUBLIC_SUPABASE_URL 등
│   │   ├── assets/
│   │   │   ├── icon.png
│   │   │   └── icon-48.png
│   │   └── src/
│   │       ├── contents/           # Content Scripts
│   │       │   ├── wanted.ts       # 원티드 파서 (FR5)
│   │       │   ├── saramin.ts      # 사람인 파서 (FR6)
│   │       │   └── shared/
│   │       │       ├── parser.ts   # 공통 파싱 유틸
│   │       │       └── detector.ts # 새 지원 감지 (FR8)
│   │       ├── background/
│   │       │   ├── index.ts        # Service Worker
│   │       │   ├── auth.ts         # 세션 공유 (FR4)
│   │       │   └── sync.ts         # 백엔드 동기화 (FR7)
│   │       ├── popup/
│   │       │   ├── index.tsx       # 팝업 UI
│   │       │   └── Popup.tsx
│   │       └── lib/
│   │           ├── supabase.ts     # Extension용 클라이언트
│   │           └── storage.ts      # chrome.storage 래퍼
│   │
│   └── web/                        # Next.js Dashboard
│       ├── package.json
│       ├── next.config.js
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       ├── postcss.config.js
│       ├── .env.local              # SUPABASE_URL, CLAUDE_API_KEY
│       ├── components.json         # shadcn/ui 설정
│       └── src/
│           ├── app/
│           │   ├── globals.css
│           │   ├── layout.tsx      # 루트 레이아웃
│           │   ├── page.tsx        # 랜딩/리다이렉트
│           │   ├── error.tsx       # 에러 바운더리
│           │   ├── loading.tsx     # 로딩 UI
│           │   │
│           │   ├── (auth)/         # 인증 라우트 그룹
│           │   │   ├── layout.tsx
│           │   │   ├── login/
│           │   │   │   └── page.tsx        # FR2
│           │   │   └── signup/
│           │   │       └── page.tsx        # FR1
│           │   │
│           │   ├── (dashboard)/    # 대시보드 라우트 그룹
│           │   │   ├── layout.tsx          # 사이드바 포함
│           │   │   ├── applications/
│           │   │   │   ├── page.tsx        # 목록 (FR9-12)
│           │   │   │   └── [id]/
│           │   │   │       ├── page.tsx    # 상세 (FR18-20)
│           │   │   │       ├── edit/
│           │   │   │       │   └── page.tsx    # 상태 변경 (FR13)
│           │   │   │       └── delete/
│           │   │   │           └── route.ts    # 삭제 (FR21)
│           │   │   └── settings/
│           │   │       └── page.tsx
│           │   │
│           │   └── api/            # API Routes
│           │       ├── applications/
│           │       │   ├── route.ts        # GET, POST
│           │       │   └── [id]/
│           │       │       └── route.ts    # GET, PATCH, DELETE
│           │       ├── ai/
│           │       │   ├── summarize/
│           │       │   │   └── route.ts    # FR14, FR16
│           │       │   └── questions/
│           │       │       └── route.ts    # FR15, FR17
│           │       └── auth/
│           │           └── callback/
│           │               └── route.ts    # OAuth 콜백
│           │
│           ├── components/
│           │   ├── ui/             # shadcn/ui 컴포넌트
│           │   │   ├── button.tsx
│           │   │   ├── card.tsx
│           │   │   ├── input.tsx
│           │   │   ├── select.tsx
│           │   │   ├── skeleton.tsx
│           │   │   ├── toast.tsx
│           │   │   └── ...
│           │   ├── features/       # 기능별 컴포넌트
│           │   │   ├── ApplicationCard.tsx
│           │   │   ├── ApplicationList.tsx
│           │   │   ├── ApplicationFilters.tsx
│           │   │   ├── JDSummary.tsx
│           │   │   ├── InterviewQuestions.tsx
│           │   │   └── StatusBadge.tsx
│           │   └── layouts/
│           │       ├── Sidebar.tsx
│           │       ├── Header.tsx
│           │       └── Footer.tsx
│           │
│           ├── lib/
│           │   ├── supabase/
│           │   │   ├── client.ts           # 브라우저용
│           │   │   ├── server.ts           # 서버 컴포넌트용
│           │   │   └── middleware.ts       # 인증 미들웨어
│           │   ├── claude/
│           │   │   ├── client.ts           # Claude API 클라이언트
│           │   │   └── prompts.ts          # 프롬프트 템플릿
│           │   ├── queries/                # React Query 훅
│           │   │   ├── keys.ts             # Query Key 정의
│           │   │   ├── useApplications.ts
│           │   │   ├── useApplication.ts
│           │   │   └── useJDSummary.ts
│           │   └── validations/            # Zod 스키마
│           │       ├── application.ts
│           │       └── auth.ts
│           │
│           ├── types/              # 로컬 타입 (shared 보완)
│           │   └── next-auth.d.ts
│           │
│           └── middleware.ts       # Next.js 미들웨어 (인증 체크)
│
├── packages/
│   └── shared/                     # 공유 패키지
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types/
│           │   ├── index.ts
│           │   ├── application.ts  # Application, ApplicationStatus
│           │   ├── jdSummary.ts    # JDSummary, InterviewQuestion
│           │   ├── user.ts         # User
│           │   └── api.ts          # ApiResponse, ApiError
│           ├── constants/
│           │   ├── index.ts
│           │   ├── platforms.ts    # Platform enum
│           │   └── status.ts       # ApplicationStatus enum
│           └── utils/
│               ├── index.ts
│               └── date.ts         # 날짜 포맷 유틸
│
└── supabase/
    ├── config.toml                 # Supabase CLI 설정
    ├── seed.sql                    # 시드 데이터
    └── migrations/
        └── 00001_initial_schema.sql    # 초기 스키마
```

### Architectural Boundaries

#### API Boundaries

| 경계 | 설명 | 접근 방식 |
|------|------|-----------|
| **Extension → Supabase** | 직접 연결 | Supabase JS Client + RLS |
| **Dashboard → Supabase** | 직접 연결 | Server/Client Components |
| **Dashboard → Claude** | API Route 경유 | `/api/ai/*` (API 키 보호) |
| **Extension ↔ Dashboard** | chrome.storage | 세션 토큰 공유 |

#### Component Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Popup     │  │  Contents   │  │   Background    │  │
│  │   (React)   │  │  (Parsers)  │  │   (Service)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │ chrome.storage (토큰)
                            │ Supabase Client (데이터)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     Supabase                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │    Auth     │  │  Database   │  │    Realtime     │  │
│  │   (JWT)     │  │ (PostgreSQL)│  │   (변경 감지)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │ Supabase Client
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Next.js Dashboard                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  (auth)     │  │ (dashboard) │  │   API Routes    │  │
│  │  Routes     │  │   Routes    │  │  (Claude 연동)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │ Next.js API Route
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      Claude API                          │
│         (JD 요약, 면접 예상 질문 생성)                   │
└─────────────────────────────────────────────────────────┘
```

### Requirements to Structure Mapping

#### FR → 파일 매핑

| FR | 설명 | 구현 위치 |
|----|------|-----------|
| FR1 | 회원가입 | `apps/web/src/app/(auth)/signup/page.tsx` |
| FR2 | 로그인 | `apps/web/src/app/(auth)/login/page.tsx` |
| FR3 | 로그아웃 | `apps/web/src/components/layouts/Header.tsx` |
| FR4 | 세션 공유 | `apps/extension/src/background/auth.ts` |
| FR5 | 원티드 파싱 | `apps/extension/src/contents/wanted.ts` |
| FR6 | 사람인 파싱 | `apps/extension/src/contents/saramin.ts` |
| FR7 | 백엔드 동기화 | `apps/extension/src/background/sync.ts` |
| FR8 | 새 지원 감지 | `apps/extension/src/contents/shared/detector.ts` |
| FR9 | 지원 목록 | `apps/web/src/app/(dashboard)/applications/page.tsx` |
| FR10-12 | 검색/필터 | `apps/web/src/components/features/ApplicationFilters.tsx` |
| FR13 | 상태 변경 | `apps/web/src/app/(dashboard)/applications/[id]/edit/page.tsx` |
| FR14 | JD 요약 생성 | `apps/web/src/app/api/ai/summarize/route.ts` |
| FR15 | 예상 질문 생성 | `apps/web/src/app/api/ai/questions/route.ts` |
| FR16 | JD 요약 조회 | `apps/web/src/components/features/JDSummary.tsx` |
| FR17 | 예상 질문 조회 | `apps/web/src/components/features/InterviewQuestions.tsx` |
| FR18-20 | 공고 상세 | `apps/web/src/app/(dashboard)/applications/[id]/page.tsx` |
| FR21 | 공고 삭제 | `apps/web/src/app/(dashboard)/applications/[id]/delete/route.ts` |

#### Cross-Cutting Concerns 매핑

| 관심사 | 위치 |
|--------|------|
| **인증 미들웨어** | `apps/web/src/middleware.ts` |
| **Supabase 클라이언트** | `apps/web/src/lib/supabase/` |
| **API 응답 타입** | `packages/shared/src/types/api.ts` |
| **에러 핸들링** | `apps/web/src/app/error.tsx` |
| **공유 타입** | `packages/shared/src/types/` |

### Data Flow

```
1. 지원 수집 흐름:
   원티드/사람인 → Content Script (파싱)
   → Background Script (큐잉)
   → Supabase (저장)
   → Dashboard (Realtime 수신)

2. JD 요약 흐름:
   Dashboard (요청)
   → API Route (/api/ai/summarize)
   → 캐시 확인 (jd_summaries 테이블)
   → [캐시 없음] Claude API 호출
   → 결과 캐싱 + 응답

3. 인증 흐름:
   Dashboard (로그인)
   → Supabase Auth
   → 토큰 발급
   → chrome.storage.local 저장
   → Extension에서 토큰 읽기
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

모든 기술 결정이 충돌 없이 함께 작동합니다:

| 결정 조합 | 호환성 | 검증 |
|-----------|--------|------|
| pnpm workspace + Plasmo + Next.js 14 | ✅ 호환 | 독립적 빌드 시스템, 워크스페이스 지원 |
| Supabase PostgreSQL + Supabase Auth | ✅ 완벽 통합 | RLS, Realtime 네이티브 지원 |
| React 18 + Next.js 14.2.x | ✅ 안전 | CVE-2025-55182 회피 |
| React Query + Zod + shadcn/ui | ✅ 호환 | 일반적인 React 생태계 조합 |
| Extension + Dashboard Tailwind CSS | ✅ 일관성 | 동일 디자인 시스템 공유 |

**Pattern Consistency:**

- 네이밍 규칙 일관성 ✅ (DB: snake_case, API: camelCase, Code: TypeScript 표준)
- API 응답 형식 표준화 ✅ (`{ success, data/error }`)
- Query Key 패턴 정의 ✅ (계층적 키 구조)
- 에러 핸들링 패턴 정의 ✅ (에러 코드 + 메시지)

**Structure Alignment:**

- 모노레포 구조가 모든 결정 지원 ✅
- Extension → Supabase, Dashboard → Claude 경계 명확 ✅
- shared 패키지로 타입 공유 ✅

### Requirements Coverage Validation ✅

**Functional Requirements Coverage (21개):**

| 영역 | FR | 아키텍처 지원 | 구현 위치 |
|------|-----|--------------|----------|
| **인증** | FR1-4 | ✅ | Supabase Auth + chrome.storage |
| **수집** | FR5-8 | ✅ | wanted.ts, saramin.ts, sync.ts, detector.ts |
| **관리** | FR9-13, FR21 | ✅ | Dashboard routes + filters |
| **AI** | FR14-17 | ✅ | /api/ai/summarize, /api/ai/questions |
| **상세** | FR18-20 | ✅ | applications/[id]/page.tsx |

**Non-Functional Requirements Coverage (17개):**

| 카테고리 | NFR | 아키텍처 지원 | 구현 방식 |
|----------|-----|--------------|----------|
| **Performance** | P1-P4 | ✅ | React Query 캐싱, Supabase 최적화, Next.js SSR |
| **Security** | S1-S5 | ✅ | HTTPS(Vercel), Supabase Auth, RLS, 서버사이드 Claude API |
| **Reliability** | R1-R4 | ✅ | 파서 에러 핸들링, Vercel/Supabase 관리형 인프라 |
| **Integration** | I1-I4 | ✅ | Manifest V3, 세션 공유, Realtime, graceful degradation |

**커버리지 결과:** 21 FR + 17 NFR = **38개 요구사항 100% 아키텍처 지원**

### Implementation Readiness Validation ✅

**Decision Completeness:**

- [x] 모든 핵심 기술 버전 명시됨 (Next.js 14.2.x, React 18.2, Supabase JS 2.89.0)
- [x] 구현 패턴이 충분히 상세함 (네이밍, 구조, 통신, 프로세스)
- [x] 일관성 규칙이 명확하고 강제 가능
- [x] 주요 패턴에 대한 코드 예시 제공됨

**Structure Completeness:**

- [x] 전체 디렉토리 구조 완전 정의됨 (70+ 파일/폴더)
- [x] 21개 FR 모두 구체적 파일 위치에 매핑됨
- [x] 통합 지점 명확히 지정됨 (Extension↔Supabase, Dashboard↔Claude)
- [x] 컴포넌트 경계 ASCII 다이어그램으로 시각화됨

**Pattern Completeness:**

- [x] 잠재적 충돌 지점 해결됨 (DB↔API 네이밍 변환)
- [x] Anti-pattern 문서화됨 (금지 사항 명시)
- [x] 통신 패턴 완전 지정됨 (React Query, Extension 메시징)
- [x] 프로세스 패턴 완료됨 (에러 핸들링, 로딩 상태)

### Gap Analysis Results

**Critical Gaps:** 없음 ✅

**Important Gaps (비차단):**

| 갭 | 영향 | 권장 대응 |
|----|------|----------|
| 테스트 프레임워크 상세 | 낮음 | 첫 번째 스토리에서 Vitest 설정 포함 |
| 환경변수 전체 목록 | 낮음 | .env.example 파일에 문서화 |

**Nice-to-Have:**

- Claude API 프롬프트 템플릿 상세화 (구현 시 결정)
- 데이터베이스 인덱싱 전략 (성능 테스트 후 최적화)
- API 에러 코드 확장 (필요 시 추가)

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] 프로젝트 컨텍스트 철저히 분석됨
- [x] 규모 및 복잡도 평가됨
- [x] 기술적 제약사항 식별됨
- [x] Cross-cutting concerns 매핑됨

**✅ Architectural Decisions**

- [x] 핵심 결정이 버전과 함께 문서화됨
- [x] 기술 스택 완전히 지정됨
- [x] 통합 패턴 정의됨
- [x] 성능 고려사항 해결됨

**✅ Implementation Patterns**

- [x] 네이밍 규칙 수립됨
- [x] 구조 패턴 정의됨
- [x] 통신 패턴 지정됨
- [x] 프로세스 패턴 문서화됨

**✅ Project Structure**

- [x] 전체 디렉토리 구조 정의됨
- [x] 컴포넌트 경계 수립됨
- [x] 통합 지점 매핑됨
- [x] 요구사항 → 구조 매핑 완료됨

### Architecture Readiness Assessment

**Overall Status:** ✅ **READY FOR IMPLEMENTATION**

**Confidence Level:** HIGH

**Key Strengths:**

1. **명확한 기술 스택**: 검증된 기술 조합 (Next.js 14 + Supabase + Plasmo)
2. **보안 고려**: CVE-2025-55182 회피, RLS 적용, 서버사이드 API 키 보호
3. **확장 가능한 구조**: 모노레포, shared 패키지로 코드 재사용
4. **100% 요구사항 커버리지**: 38개 요구사항 모두 아키텍처적으로 지원
5. **AI 에이전트 친화적**: 상세한 패턴과 규칙으로 일관된 구현 가능

**Areas for Future Enhancement:**

- 테스트 자동화 확장 (E2E, 통합 테스트)
- 모니터링/로깅 인프라 (Sentry, LogRocket)
- 성능 최적화 (Redis 캐싱, CDN)
- 추가 플랫폼 파서 (잡코리아, 링크드인)

### Implementation Handoff

**AI Agent Guidelines:**

1. 모든 아키텍처 결정을 문서화된 대로 정확히 따를 것
2. 구현 패턴을 모든 컴포넌트에서 일관되게 사용할 것
3. 프로젝트 구조와 경계를 존중할 것
4. 아키텍처 관련 질문은 이 문서를 참조할 것

**First Implementation Priority:**

```bash
# 1. 프로젝트 초기화 (Starter Template 사용)
mkdir job-application-tracker && cd job-application-tracker
pnpm init

# 2. 워크스페이스 설정
echo "packages:
  - 'apps/*'
  - 'packages/*'" > pnpm-workspace.yaml

# 3. Extension + Web 앱 생성
pnpm create plasmo@latest extension --with-tailwindcss
pnpm create next-app@14 web --typescript --tailwind --eslint --app

# 4. Supabase 설정
supabase init
supabase db push
```

**Implementation Sequence:**

1. Epic 1: 프로젝트 초기화 + Supabase 스키마
2. Epic 2: 인증 (Dashboard + Extension 세션 공유)
3. Epic 3: 데이터 수집 (원티드/사람인 파서)
4. Epic 4: 대시보드 UI (목록, 검색, 필터)
5. Epic 5: AI 통합 (JD 요약, 예상 질문)

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-03
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

**📋 Complete Architecture Document**

- 모든 아키텍처 결정이 구체적인 버전과 함께 문서화됨
- AI 에이전트 일관성을 보장하는 구현 패턴 정의됨
- 모든 파일과 디렉토리가 포함된 완전한 프로젝트 구조
- 요구사항 → 아키텍처 매핑 완료
- 일관성과 완전성을 확인하는 검증 결과

**🏗️ Implementation Ready Foundation**

- **15+** 핵심 아키텍처 결정
- **4** 구현 패턴 카테고리 (Naming, Structure, Format, Communication)
- **5** 아키텍처 컴포넌트 (Extension, Dashboard, Supabase, Claude API, Shared)
- **38** 요구사항 100% 지원 (21 FR + 17 NFR)

**📚 AI Agent Implementation Guide**

- 검증된 버전의 기술 스택
- 구현 충돌을 방지하는 일관성 규칙
- 명확한 경계가 있는 프로젝트 구조
- 통합 패턴 및 통신 표준

### Quality Assurance Checklist

**✅ Architecture Coherence**

- [x] 모든 결정이 충돌 없이 함께 작동
- [x] 기술 선택이 호환됨
- [x] 패턴이 아키텍처 결정을 지원
- [x] 구조가 모든 선택에 부합

**✅ Requirements Coverage**

- [x] 모든 기능 요구사항 지원됨
- [x] 모든 비기능 요구사항 해결됨
- [x] Cross-cutting concerns 처리됨
- [x] 통합 지점 정의됨

**✅ Implementation Readiness**

- [x] 결정이 구체적이고 실행 가능
- [x] 패턴이 에이전트 충돌 방지
- [x] 구조가 완전하고 모호함 없음
- [x] 명확성을 위한 예시 제공됨

### Project Success Factors

**🎯 Clear Decision Framework**
모든 기술 선택이 명확한 근거와 함께 협력적으로 이루어져 모든 이해관계자가 아키텍처 방향을 이해합니다.

**🔧 Consistency Guarantee**
구현 패턴과 규칙이 여러 AI 에이전트가 호환 가능하고 일관된 코드를 생성하도록 보장합니다.

**📋 Complete Coverage**
모든 프로젝트 요구사항이 아키텍처적으로 지원되며, 비즈니스 요구에서 기술 구현까지 명확한 매핑이 있습니다.

**🏗️ Solid Foundation**
선택된 스타터 템플릿과 아키텍처 패턴이 현재 모범 사례를 따르는 프로덕션 준비 기반을 제공합니다.

---

**Architecture Status:** ✅ **READY FOR IMPLEMENTATION**

**Next Phase:** 여기에 문서화된 아키텍처 결정과 패턴을 사용하여 구현 시작

**Document Maintenance:** 구현 중 주요 기술 결정이 내려지면 이 아키텍처 업데이트

