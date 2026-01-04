# Story 1.2: Next.js 14 Web 앱 설정

Status: done

## Story

As a **개발자**,
I want **Next.js 14 App Router 기반 대시보드 앱을 생성하여**,
so that **사용자에게 지원 공고 관리 인터페이스를 제공할 수 있다**.

## Acceptance Criteria

1. **Next.js 14.2.x 설치**
   - Given apps/web 디렉토리가 있을 때
   - When Next.js 앱을 초기화하면
   - Then Next.js ^14.2.35가 설치된다
   - And React ^18.2.0이 설치된다 (React 19 사용 금지)

2. **App Router 구조 설정**
   - Given Next.js가 설치되었을 때
   - When 앱 구조를 설정하면
   - Then `app/` 디렉토리 기반 App Router가 구성된다
   - And `(auth)`, `(dashboard)` Route Groups가 생성된다

3. **TypeScript strict mode 활성화**
   - Given Next.js 앱이 생성되었을 때
   - When TypeScript 설정을 확인하면
   - Then `strict: true`가 설정되어 있다
   - And 루트 tsconfig.base.json을 extends한다

4. **Tailwind CSS 설정**
   - Given Next.js 앱이 생성되었을 때
   - When 스타일링을 설정하면
   - Then Tailwind CSS ^3.x가 설치된다
   - And tailwind.config.js가 생성된다
   - And globals.css에 Tailwind directives가 포함된다

5. **개발 서버 실행**
   - Given 모든 설정이 완료되었을 때
   - When `pnpm dev:web`을 실행하면
   - Then 개발 서버가 성공적으로 시작된다
   - And http://localhost:3000에서 페이지가 표시된다

## Tasks / Subtasks

- [x] Task 1: apps/web 디렉토리 정리 및 Next.js 초기화 (AC: #1)
  - [x] 1.1 기존 placeholder package.json 백업/제거
  - [x] 1.2 Next.js 14.2.x 앱 생성 (create-next-app 또는 수동 설정)
  - [x] 1.3 React ^18.2.0, react-dom ^18.2.0 버전 고정 확인
  - [x] 1.4 Next.js 15/16, React 19 의존성 없는지 확인

- [x] Task 2: App Router 구조 설정 (AC: #2)
  - [x] 2.1 src/app 디렉토리 생성
  - [x] 2.2 app/layout.tsx 생성 (RootLayout)
  - [x] 2.3 app/page.tsx 생성 (홈페이지/리다이렉트)
  - [x] 2.4 app/(auth) Route Group 생성 (login, signup placeholder)
  - [x] 2.5 app/(dashboard) Route Group 생성 (applications placeholder)
  - [x] 2.6 app/api 디렉토리 생성 (placeholder)

- [x] Task 3: TypeScript 설정 (AC: #3)
  - [x] 3.1 apps/web/tsconfig.json 생성
  - [x] 3.2 루트 tsconfig.base.json extends 설정
  - [x] 3.3 strict: true 확인
  - [x] 3.4 @/* path alias 설정

- [x] Task 4: Tailwind CSS + shadcn/ui 설정 (AC: #4)
  - [x] 4.1 tailwindcss, postcss, autoprefixer 설치
  - [x] 4.2 tailwind.config.js 생성
  - [x] 4.3 postcss.config.js 생성
  - [x] 4.4 globals.css에 Tailwind directives 추가
  - [x] 4.5 shadcn/ui 초기화 (npx shadcn-ui@latest init)
  - [x] 4.6 기본 UI 컴포넌트 디렉토리 구조 생성

- [x] Task 5: 추가 설정 및 검증 (AC: #5)
  - [x] 5.1 next.config.js 생성 (기본 설정)
  - [x] 5.2 ESLint 설정 (.eslintrc.json)
  - [x] 5.3 .env.example 생성 (환경변수 템플릿)
  - [x] 5.4 pnpm dev:web 실행 및 성공 확인
  - [x] 5.5 http://localhost:3000 접속 확인

## Dev Notes

### Critical Technical Requirements

**🚨 SECURITY: Version Constraints (MUST FOLLOW)**

```json
{
  "dependencies": {
    "next": "^14.2.35",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

**CVE-2025-55182 회피:**
- Next.js 15/16 사용 절대 금지 (React Server Components RCE 취약점)
- React 19 사용 금지 (보안 패치 19.2.3+ 나올 때까지)
- create-next-app 사용 시 버전 명시 필수: `npx create-next-app@14`

### Project Structure Notes

**Target Directory Structure:**
```
apps/web/
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── components.json         # shadcn/ui 설정
├── .eslintrc.json
├── .env.example
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx      # RootLayout
    │   ├── page.tsx        # 홈 (리다이렉트)
    │   ├── error.tsx       # Error Boundary
    │   ├── loading.tsx     # Loading UI
    │   ├── (auth)/
    │   │   ├── layout.tsx
    │   │   ├── login/
    │   │   │   └── page.tsx
    │   │   └── signup/
    │   │       └── page.tsx
    │   ├── (dashboard)/
    │   │   ├── layout.tsx
    │   │   └── applications/
    │   │       └── page.tsx
    │   └── api/
    │       └── health/
    │           └── route.ts    # Health check endpoint
    ├── components/
    │   ├── ui/             # shadcn/ui 컴포넌트
    │   ├── features/       # 기능별 컴포넌트
    │   └── layouts/        # 레이아웃 컴포넌트
    ├── lib/
    │   └── utils.ts        # cn() 유틸리티 (shadcn 필수)
    └── types/
        └── index.ts        # 로컬 타입 정의
```

### Framework Configuration

**next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ['src'],
  },
  // 추후 Extension과 통신 위한 CORS 설정 가능
};

module.exports = nextConfig;
```

**tsconfig.json (apps/web):**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // shadcn/ui 테마 확장은 init 시 자동 생성
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### shadcn/ui 초기화

**components.json (shadcn/ui 설정):**
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**lib/utils.ts (cn 유틸리티):**
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Environment Variables Template

**.env.example:**
```bash
# Supabase (Story 1.3에서 설정)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Claude API (Story 5.1에서 설정)
CLAUDE_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Dependencies to Install

```json
{
  "dependencies": {
    "next": "^14.2.35",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.55.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

### Previous Story Intelligence

**Story 1.1에서 학습한 내용:**
- apps/web/package.json 이미 placeholder로 존재 → 교체 필요
- 루트 tsconfig.base.json 생성됨 → extends 활용
- pnpm workspace 정상 작동 확인됨
- Node.js >=20.0.0, pnpm >=8.15.0 제약 적용됨

**파일 패턴 유지:**
- package.json에 name: "web" 유지 (pnpm filter 호환)
- TypeScript strict mode 일관성

### Anti-Patterns (금지)

```bash
# ❌ 최신 버전 자동 설치 금지
npx create-next-app@latest  # 금지 (Next.js 15+ 설치됨)

# ✅ 버전 명시
npx create-next-app@14
```

```typescript
// ❌ Pages Router 사용 금지
// pages/index.tsx  // 금지

// ✅ App Router만 사용
// app/page.tsx
```

```typescript
// ❌ default export 남용 금지 (page.tsx 외)
export default function Component() {}  // 일반 컴포넌트는 금지

// ✅ named export 사용
export function Component() {}
```

### Commands Reference

```bash
# 개발 서버 실행
pnpm dev:web

# 빌드 검증
pnpm --filter web build

# 타입 체크
pnpm --filter web type-check

# 린트
pnpm --filter web lint
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Starter-Template-Evaluation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure-&-Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- [Source: _bmad-output/project-context.md#Next.js-14-Rules]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.2]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- Next.js 14.2.35 installed (NOT 15/16) - CVE-2025-55182 compliant
- React 18.3.1 installed (NOT React 19) - Security constraint satisfied
- App Router structure with (auth) and (dashboard) Route Groups created
- TypeScript strict mode enabled, extends tsconfig.base.json
- Tailwind CSS 3.4.x with shadcn/ui configuration (components.json, globals.css with CSS variables)
- Health check API endpoint at /api/health working
- pnpm dev:web starts successfully at localhost:3000
- ESLint and type-check passing

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-04 | Story created with comprehensive context | create-story workflow |
| 2026-01-04 | Implementation completed | Claude Opus 4.5 |

### File List

**Created:**
- apps/web/package.json (replaced placeholder)
- apps/web/tsconfig.json
- apps/web/next.config.js
- apps/web/tailwind.config.js
- apps/web/postcss.config.js
- apps/web/.eslintrc.json
- apps/web/.env.example
- apps/web/components.json
- apps/web/src/lib/utils.ts
- apps/web/src/types/index.ts
- apps/web/src/app/globals.css
- apps/web/src/app/layout.tsx
- apps/web/src/app/page.tsx
- apps/web/src/app/error.tsx
- apps/web/src/app/loading.tsx
- apps/web/src/app/(auth)/layout.tsx
- apps/web/src/app/(auth)/login/page.tsx
- apps/web/src/app/(auth)/signup/page.tsx
- apps/web/src/app/(dashboard)/layout.tsx
- apps/web/src/app/(dashboard)/applications/page.tsx
- apps/web/src/app/api/health/route.ts
- apps/web/src/components/ui/.gitkeep
- apps/web/src/components/features/.gitkeep
- apps/web/src/components/layouts/.gitkeep
