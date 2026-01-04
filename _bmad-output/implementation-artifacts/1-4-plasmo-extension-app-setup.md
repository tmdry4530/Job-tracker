# Story 1.4: Plasmo Extension 앱 설정

Status: review

## Story

As a **개발자**,
I want **Plasmo 기반 Chrome Extension 앱을 생성하여**,
so that **채용 플랫폼에서 지원 내역을 파싱하고 수집할 수 있는 기반을 마련할 수 있다**.

## Acceptance Criteria

1. **Plasmo 앱 초기화**
   - Given apps/extension 디렉토리가 있을 때
   - When Plasmo 앱을 초기화하면
   - Then Manifest V3 기반 Extension이 생성된다
   - And TypeScript + React 설정이 완료된다

2. **Tailwind CSS 설정**
   - Given Plasmo 앱이 생성되었을 때
   - When Tailwind CSS를 설정하면
   - Then tailwind.config.js가 생성된다
   - And Popup 컴포넌트에서 Tailwind 클래스 사용 가능

3. **Popup UI 기본 구조**
   - Given Tailwind가 설정되었을 때
   - When Popup 컴포넌트를 생성하면
   - Then popup.tsx가 생성된다
   - And 기본 UI가 표시된다

4. **Content Script 구조 설정**
   - Given Plasmo 앱이 생성되었을 때
   - When Content Script 구조를 설정하면
   - Then contents/ 디렉토리가 생성된다
   - And 플레이스홀더 content script가 생성된다

5. **Background Service Worker 설정**
   - Given Content Script 구조가 있을 때
   - When Background 설정을 하면
   - Then background.ts가 생성된다
   - And Service Worker로 동작 준비 완료

6. **개발 빌드 실행**
   - Given 모든 설정이 완료되었을 때
   - When `pnpm dev:extension`을 실행하면
   - Then 개발 빌드가 성공적으로 완료된다
   - And Chrome에서 Extension 로드가 가능하다

## Tasks / Subtasks

- [x] Task 1: Plasmo 앱 초기화 (AC: #1)
  - [x] 1.1 기존 apps/extension 플레이스홀더 내용 확인
  - [x] 1.2 Plasmo 의존성 설치 (plasmo, react, react-dom)
  - [x] 1.3 TypeScript 설정 (tsconfig.json 생성, tsconfig.base.json extends)
  - [x] 1.4 package.json scripts 설정 (dev, build)
  - [x] 1.5 .plasmo 디렉토리 .gitignore 추가

- [x] Task 2: Tailwind CSS 설정 (AC: #2)
  - [x] 2.1 tailwindcss, postcss, autoprefixer 설치
  - [x] 2.2 tailwind.config.js 생성
  - [x] 2.3 postcss.config.js 생성
  - [x] 2.4 style.css 생성 (Tailwind directives)

- [x] Task 3: Popup UI 생성 (AC: #3)
  - [x] 3.1 popup.tsx 생성 (기본 UI)
  - [x] 3.2 style.css import
  - [x] 3.3 Tailwind 스타일 적용 확인

- [x] Task 4: Content Scripts 구조 (AC: #4)
  - [x] 4.1 contents/ 디렉토리 생성
  - [x] 4.2 contents/plasmo.ts 플레이스홀더 생성 (config export)
  - [x] 4.3 Content Script manifest 설정 확인

- [x] Task 5: Background Service Worker (AC: #5)
  - [x] 5.1 background.ts 생성 (Manifest V3 Service Worker)
  - [x] 5.2 기본 이벤트 리스너 설정 (onInstalled)
  - [x] 5.3 chrome.storage 접근 준비

- [x] Task 6: 환경변수 설정
  - [x] 6.1 .env.example 생성 (PLASMO_PUBLIC_* 패턴)
  - [x] 6.2 .env.development 생성 (로컬 개발용)

- [x] Task 7: 검증 (AC: #6)
  - [x] 7.1 pnpm dev:extension 실행 성공 확인
  - [x] 7.2 빌드 출력 확인 (build/chrome-mv3-dev)
  - [x] 7.3 Chrome에서 Extension 로드 테스트

## Dev Notes

### Critical Technical Requirements

**Plasmo Framework:**
- Plasmo는 Chrome Extension 개발을 위한 React 기반 프레임워크
- Manifest V3 자동 생성
- Hot Reload 지원

**Version Constraints:**
```json
{
  "dependencies": {
    "plasmo": "^0.89.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

**🚨 SECURITY: React 19 사용 금지 (CVE-2025-55182)**

### Plasmo Project Structure

**Target Directory Structure:**
```
apps/extension/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── .env.development
├── assets/
│   └── icon.png              # Extension 아이콘 (선택)
├── popup.tsx                 # Popup UI
├── background.ts             # Service Worker
├── style.css                 # Tailwind base styles
└── contents/
    └── plasmo.ts             # Content Script placeholder
```

### Plasmo Configuration

**package.json:**
```json
{
  "name": "extension",
  "displayName": "Job Application Tracker",
  "version": "0.0.1",
  "description": "채용 플랫폼 지원 현황 자동 수집",
  "author": "Wjdtm",
  "scripts": {
    "dev": "plasmo dev",
    "build": "plasmo build",
    "package": "plasmo package"
  },
  "dependencies": {
    "plasmo": "^0.89.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.270",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0"
  },
  "manifest": {
    "host_permissions": [
      "https://www.wanted.co.kr/*",
      "https://www.saramin.co.kr/*"
    ],
    "permissions": [
      "storage",
      "activeTab"
    ]
  }
}
```

**tsconfig.json (apps/extension):**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", ".plasmo"]
}
```

**tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Popup Component Example

**popup.tsx:**
```typescript
import "./style.css"

function IndexPopup() {
  return (
    <div className="w-80 p-4 bg-white">
      <h1 className="text-lg font-bold text-gray-900">
        Job Application Tracker
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        채용 플랫폼 지원 현황을 자동으로 수집합니다.
      </p>
      <div className="mt-4 space-y-2">
        <div className="text-xs text-gray-400">
          로그인 상태: 대기 중
        </div>
        <div className="text-xs text-gray-400">
          마지막 동기화: -
        </div>
      </div>
      <button className="mt-4 w-full py-2 px-4 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
        대시보드 열기
      </button>
    </div>
  )
}

export default IndexPopup
```

**style.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Content Script Example

**contents/plasmo.ts:**
```typescript
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://www.wanted.co.kr/*", "https://www.saramin.co.kr/*"],
  all_frames: false
}

// Placeholder - 실제 파싱 로직은 Story 3.1, 3.2에서 구현
console.log("Job Application Tracker content script loaded")
```

### Background Service Worker Example

**background.ts:**
```typescript
export {}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Job Application Tracker Extension installed")
})

// 추후 구현될 기능:
// - 세션 토큰 관리 (Story 2.5)
// - 데이터 동기화 (Story 3.3)
// - 뱃지 업데이트 (Story 3.4)
```

### Environment Variables

**.env.example:**
```bash
# Supabase (Dashboard와 공유)
PLASMO_PUBLIC_SUPABASE_URL=
PLASMO_PUBLIC_SUPABASE_ANON_KEY=

# Dashboard URL
PLASMO_PUBLIC_DASHBOARD_URL=http://localhost:3000
```

### Previous Story Intelligence

**Story 1.1에서 학습한 내용:**
- pnpm workspace 구조 정상 작동
- tsconfig.base.json extends 패턴 확립됨
- apps/extension/package.json 플레이스홀더 존재

**Story 1.2에서 학습한 내용:**
- Tailwind CSS 설정 패턴 확립됨
- .eslintrc.json은 next/core-web-vitals만 extends
- .env.example 템플릿 패턴

**Story 1.3에서 학습한 내용:**
- Supabase 환경변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- Extension에서는 PLASMO_PUBLIC_* 패턴 사용

### Manifest V3 Requirements

**Chrome Extension Manifest V3 규칙:**
- Service Worker 기반 (background.js → background.ts)
- `chrome.action` API 사용 (browserAction 대신)
- host_permissions로 도메인 접근 권한 선언
- Content Scripts는 contents/ 디렉토리에 배치

### Anti-Patterns (금지)

```javascript
// ❌ Manifest V2 패턴 사용 금지
chrome.browserAction.onClicked  // 금지

// ✅ Manifest V3 패턴 사용
chrome.action.onClicked
```

```typescript
// ❌ any 타입 사용 금지
const handleMessage = (message: any) => {}

// ✅ 명시적 타입 사용
interface Message {
  type: string
  payload: unknown
}
const handleMessage = (message: Message) => {}
```

```javascript
// ❌ 환경변수 하드코딩 금지
const SUPABASE_URL = "https://xxx.supabase.co"

// ✅ 환경변수 사용
const SUPABASE_URL = process.env.PLASMO_PUBLIC_SUPABASE_URL
```

### Commands Reference

```bash
# 개발 서버 실행
pnpm dev:extension

# 프로덕션 빌드
pnpm --filter extension build

# 패키지 생성 (zip)
pnpm --filter extension package

# Chrome에서 Extension 로드:
# 1. chrome://extensions 접속
# 2. "개발자 모드" 활성화
# 3. "압축해제된 확장 프로그램 로드" 클릭
# 4. .plasmo/chrome-mv3-dev 폴더 선택
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure-&-Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Plasmo-Extension-Structure]
- [Source: _bmad-output/project-context.md#Plasmo-Extension-Rules]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.4]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- Plasmo ^0.89.5 설치 완료 (React 18.2.0 사용, CVE-2025-55182 회피)
- Manifest V3 Chrome Extension 생성 완료
- Tailwind CSS 3.4 설정 완료 (node_modules 제외 패턴 적용)
- Popup UI with Tailwind 스타일 적용
- Content Script placeholder (wanted.co.kr, saramin.co.kr 대상)
- Background Service Worker with onInstalled listener
- 환경변수 PLASMO_PUBLIC_* 패턴 적용
- 빌드 성공: build/chrome-mv3-dev 폴더에 출력 생성
- 아이콘 생성 (32x32 PNG placeholder)

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-04 | Story created with comprehensive context | create-story workflow |
| 2026-01-04 | Story implementation completed | Claude Opus 4.5 |

### File List

**Created:**
- apps/extension/package.json (Plasmo 설정 포함)
- apps/extension/tsconfig.json (tsconfig.base.json extends)
- apps/extension/tailwind.config.js
- apps/extension/postcss.config.js
- apps/extension/style.css (Tailwind directives)
- apps/extension/popup.tsx (기본 UI)
- apps/extension/background.ts (Service Worker)
- apps/extension/contents/plasmo.ts (Content Script placeholder)
- apps/extension/.env.example
- apps/extension/.env.development
- apps/extension/assets/icon.png (32x32 placeholder)
- apps/extension/assets/icon.svg (512x512 vector)
