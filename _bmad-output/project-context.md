---
project_name: 'job-tracker-boilerplate'
user_name: 'Wjdtm'
date: '2026-01-03'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'critical_rules', 'usage_guidelines']
rule_count: 54
status: 'complete'
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

| 기술 | 버전 | 비고 |
|------|------|------|
| **Node.js** | >=20.0.0 | Engine requirement |
| **pnpm** | ^8.15.0 | Package manager (monorepo) |
| **TypeScript** | ^5.3.0 | Strict mode required |
| **Next.js** | ^14.2.35 | React 18 기반, CVE-2025-55182 회피 |
| **React** | ^18.2.0 | React 19 사용 금지 (보안 취약점) |
| **Plasmo** | latest | Chrome Extension framework |
| **@supabase/supabase-js** | ^2.89.0 | Database + Auth client |
| **Tailwind CSS** | ^3.x | Styling |
| **React Query** | ^5.x | Server state management |
| **Zod** | ^3.x | Runtime validation |
| **shadcn/ui** | - | UI components (copy-paste) |

**Version Constraints:**
- Next.js 15/16 사용 금지 (CVE-2025-55182 RCE 취약점)
- React 19 사용 금지 (보안 패치 19.2.3+ 나올 때까지)

---

## Critical Implementation Rules

### TypeScript Rules

**Configuration:**
- `strict: true` 필수
- `noImplicitAny: true` - `any` 타입 사용 금지
- 불가피한 `any` 사용 시 주석으로 사유 명시

**Import/Export:**
- Absolute imports: `@/*` alias 사용 (apps/web)
- Shared package: `@shared/*` 또는 workspace protocol
- Named exports 선호 (default export는 page.tsx만)

**Type Definitions:**
- 공유 타입: `packages/shared/src/types/`에 정의
- I- prefix 사용 금지 (`IUser` ❌ → `User` ✅)
- Enum 대신 `as const` 객체 권장

**Error Handling:**
- try-catch에서 `unknown` 타입 사용
- Zod로 외부 데이터 검증 필수

---

### Next.js 14 Rules

**App Router:**
- Server Components 기본, `'use client'` 명시적 선언
- API Routes: `app/api/*/route.ts` 패턴
- Route Groups: `(auth)`, `(dashboard)` 사용

**Data Fetching:**
- Server Components: 직접 Supabase 호출
- Client Components: React Query 훅 사용

---

### Plasmo (Extension) Rules

**Content Scripts:**
- 파일명 = 타겟 도메인: `wanted.ts`, `saramin.ts`
- PLASMO_PUBLIC_* 환경변수만 클라이언트 노출

**Background Service Worker:**
- Manifest V3 규격 준수
- chrome.storage.local로 세션 토큰 공유

---

### React Rules

**Components:**
- 함수형 컴포넌트 + Hooks만 사용
- Class 컴포넌트 사용 금지

**State Management:**
- Server state: React Query
- UI state: useState/useReducer
- Redux/Zustand 사용하지 않음

**Hooks:**
- Custom hooks: `use` prefix 필수
- Query hooks: `apps/web/src/lib/queries/`에 정의

---

### Testing Rules

**Framework:**
- Vitest (권장)
- Test co-location: 소스 파일 옆에 `*.test.ts(x)`

**Structure:**
```
src/
├── lib/
│   ├── supabaseClient.ts
│   └── supabaseClient.test.ts  # 코로케이션
```

**Coverage:**
- 목표: 80% 이상
- 커밋 전 테스트 통과 필수

**Naming:**
- 파일: `ComponentName.test.tsx`
- describe: 기능 단위
- it/test: 행동 설명 (`should ...`)

---

### Naming Conventions

| 항목 | 규칙 | 예시 |
|------|------|------|
| **DB 테이블** | snake_case, 복수형 | `applications`, `jd_summaries` |
| **DB 컬럼** | snake_case | `user_id`, `created_at` |
| **API 엔드포인트** | kebab-case | `/api/jd-summaries` |
| **컴포넌트 파일** | PascalCase.tsx | `ApplicationCard.tsx` |
| **유틸 파일** | camelCase.ts | `supabaseClient.ts` |
| **함수** | camelCase, 동사 시작 | `getApplications()` |
| **상수** | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |

---

### API Response Format

```typescript
// 성공
{ success: true, data: T }

// 실패
{ success: false, error: { code: string, message: string } }
```

**Error Codes:**
- `VALIDATION_ERROR` - 입력 검증 실패
- `NOT_FOUND` - 리소스 없음
- `UNAUTHORIZED` - 인증 필요
- `INTERNAL_ERROR` - 서버 오류

---

### Code Organization

```
apps/web/src/
├── app/           # Routes (App Router)
├── components/
│   ├── ui/        # shadcn/ui 기본
│   ├── features/  # 기능별 컴포넌트
│   └── layouts/   # 레이아웃
├── lib/
│   ├── supabase/  # DB 클라이언트
│   ├── queries/   # React Query 훅
│   └── validations/ # Zod 스키마
└── types/         # 로컬 타입
```

---

## Anti-Patterns (금지)

```typescript
// ❌ 직접 fetch 사용
const data = await fetch('/api/user');

// ✅ React Query 훅 사용
const { data } = useUser();
```

```typescript
// ❌ 비표준 API 응답
return { error: error.message };

// ✅ 표준 형식
return { success: false, error: { code: 'ERROR_CODE', message } };
```

```typescript
// ❌ any 타입
const handleData = (data: any) => { ... }

// ✅ 명시적 타입
const handleData = (data: Application) => { ... }
```

---

## Security Rules

- Claude API 키: 서버사이드만 (`/api/ai/*`)
- Supabase RLS: `auth.uid() = user_id` 정책 필수
- 환경변수: `.env` 파일 커밋 금지
- API 키 하드코딩 금지
- HTTPS 전용 (Vercel 자동 적용)

---

## Production Code Rules

- `console.log` 프로덕션 코드에 남기지 않기
- `any` 타입 사용 금지
- 커밋 전 `pnpm lint && pnpm type-check` 필수
- 테스트 통과 확인 후 커밋

---

## Query Key Patterns

```typescript
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
```

---

## Extension ↔ Dashboard Communication

```typescript
type MessageType =
  | 'AUTH_TOKEN_UPDATED'
  | 'APPLICATION_SYNCED'
  | 'PARSE_COMPLETED'
  | 'PARSE_FAILED';

interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: number;
}
```

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Refer to `architecture.md` for detailed architectural decisions

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

---

_Last Updated: 2026-01-03_
_Source: architecture.md, CLAUDE.md_
