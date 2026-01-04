# Story 1.5: Shared 패키지 설정

Status: ready-for-dev

## Story

As a **개발자**,
I want **Extension과 Web 간 공유할 타입과 유틸리티를 관리하여**,
so that **코드 재사용성을 높이고 타입 일관성을 유지할 수 있다**.

## Acceptance Criteria

1. **TypeScript 라이브러리 빌드**
   - Given packages/shared 디렉토리가 있을 때
   - When Shared 패키지를 빌드하면
   - Then TypeScript 라이브러리가 생성된다
   - And ESM + CJS 포맷으로 출력된다

2. **공유 타입 정의**
   - Given 빌드 설정이 완료되었을 때
   - When 타입을 정의하면
   - Then Application, ApplicationStatus, Platform 타입이 정의된다
   - And User 타입이 정의된다
   - And ApiResponse, ApiError 타입이 정의된다

3. **Zod 스키마 정의**
   - Given 공유 타입이 정의되었을 때
   - When Zod 스키마를 작성하면
   - Then Application 스키마가 정의된다
   - And 타입 추론이 가능하다

4. **Workspace 의존성**
   - Given 패키지가 설정되었을 때
   - When apps/web과 apps/extension에서 import하면
   - Then @shared/* 경로로 import 가능하다
   - And TypeScript 타입 추론이 정상 작동한다

## Tasks / Subtasks

- [ ] Task 1: 패키지 초기화 (AC: #1)
  - [ ] 1.1 기존 packages/shared 플레이스홀더 내용 확인
  - [ ] 1.2 package.json 생성 (name: @job-tracker/shared)
  - [ ] 1.3 tsconfig.json 생성 (tsconfig.base.json extends)
  - [ ] 1.4 tsup 의존성 설치 및 tsup.config.ts 생성
  - [ ] 1.5 빌드 스크립트 설정 (build, dev)

- [ ] Task 2: 타입 정의 (AC: #2)
  - [ ] 2.1 src/types/ 디렉토리 생성
  - [ ] 2.2 src/types/application.ts 작성 (Application, ApplicationStatus)
  - [ ] 2.3 src/types/platform.ts 작성 (Platform enum)
  - [ ] 2.4 src/types/user.ts 작성 (User)
  - [ ] 2.5 src/types/api.ts 작성 (ApiResponse, ApiError)
  - [ ] 2.6 src/types/index.ts 배럴 파일 생성

- [ ] Task 3: Zod 스키마 정의 (AC: #3)
  - [ ] 3.1 zod 의존성 설치
  - [ ] 3.2 src/schemas/ 디렉토리 생성
  - [ ] 3.3 src/schemas/application.ts 작성
  - [ ] 3.4 src/schemas/index.ts 배럴 파일 생성

- [ ] Task 4: 상수 정의
  - [ ] 4.1 src/constants/ 디렉토리 생성
  - [ ] 4.2 src/constants/platforms.ts 작성
  - [ ] 4.3 src/constants/status.ts 작성
  - [ ] 4.4 src/constants/index.ts 배럴 파일 생성

- [ ] Task 5: 유틸리티 함수
  - [ ] 5.1 src/utils/ 디렉토리 생성
  - [ ] 5.2 src/utils/date.ts 작성 (날짜 포맷 유틸)
  - [ ] 5.3 src/utils/index.ts 배럴 파일 생성

- [ ] Task 6: 메인 엔트리 포인트
  - [ ] 6.1 src/index.ts 생성 (모든 export 통합)

- [ ] Task 7: Workspace 연동 (AC: #4)
  - [ ] 7.1 apps/web/package.json에 @job-tracker/shared 의존성 추가
  - [ ] 7.2 apps/extension/package.json에 @job-tracker/shared 의존성 추가
  - [ ] 7.3 apps/web/tsconfig.json paths 설정
  - [ ] 7.4 apps/extension/tsconfig.json paths 설정

- [ ] Task 8: 검증
  - [ ] 8.1 pnpm build:shared 실행 성공 확인
  - [ ] 8.2 apps/web에서 import 테스트
  - [ ] 8.3 apps/extension에서 import 테스트
  - [ ] 8.4 TypeScript 타입 추론 확인

## Dev Notes

### Critical Technical Requirements

**빌드 도구:**
- tsup 사용 (경량, 빠른 번들링)
- ESM + CJS 듀얼 포맷 출력
- Declaration 파일 자동 생성

**Version Constraints:**
```json
{
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  }
}
```

### Shared Package Structure

**Target Directory Structure:**
```
packages/shared/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── src/
│   ├── index.ts                  # 메인 엔트리
│   ├── types/
│   │   ├── index.ts              # 타입 배럴
│   │   ├── application.ts        # Application, ApplicationStatus
│   │   ├── platform.ts           # Platform enum
│   │   ├── user.ts               # User
│   │   └── api.ts                # ApiResponse, ApiError
│   ├── schemas/
│   │   ├── index.ts              # 스키마 배럴
│   │   └── application.ts        # Zod 스키마
│   ├── constants/
│   │   ├── index.ts              # 상수 배럴
│   │   ├── platforms.ts          # Platform 상수
│   │   └── status.ts             # Status 상수
│   └── utils/
│       ├── index.ts              # 유틸 배럴
│       └── date.ts               # 날짜 포맷
└── dist/                         # 빌드 출력
    ├── index.js                  # ESM
    ├── index.cjs                 # CJS
    └── index.d.ts                # 타입 선언
```

### Type Definitions

**Application Type (architecture.md 참조):**
```typescript
// src/types/application.ts
export type ApplicationStatus =
  | 'applied'
  | 'document_passed'
  | 'interview'
  | 'accepted'
  | 'rejected';

export type Platform = 'wanted' | 'saramin';

export interface Application {
  id: string;
  user_id: string;
  platform: Platform;
  company_name: string;
  position: string;
  original_url: string;
  jd_content: string | null;
  status: ApplicationStatus;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}
```

**User Type:**
```typescript
// src/types/user.ts
export interface User {
  id: string;
  email: string;
  created_at: string;
}
```

**API Response Types:**
```typescript
// src/types/api.ts
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'INTERNAL_ERROR';
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
```

### Zod Schema Example

**Application Schema:**
```typescript
// src/schemas/application.ts
import { z } from 'zod';

export const ApplicationStatusSchema = z.enum([
  'applied',
  'document_passed',
  'interview',
  'accepted',
  'rejected',
]);

export const PlatformSchema = z.enum(['wanted', 'saramin']);

export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  platform: PlatformSchema,
  company_name: z.string().min(1),
  position: z.string().min(1),
  original_url: z.string().url(),
  jd_content: z.string().nullable(),
  status: ApplicationStatusSchema,
  applied_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ApplicationFromSchema = z.infer<typeof ApplicationSchema>;
```

### Package Configuration

**package.json:**
```json
{
  "name": "@job-tracker/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  }
}
```

**tsconfig.json:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**tsup.config.ts:**
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
});
```

### Workspace Integration

**apps/web/package.json 추가:**
```json
{
  "dependencies": {
    "@job-tracker/shared": "workspace:*"
  }
}
```

**apps/extension/package.json 추가:**
```json
{
  "dependencies": {
    "@job-tracker/shared": "workspace:*"
  }
}
```

### Import Usage Example

**apps/web에서 사용:**
```typescript
import { Application, ApplicationStatus, Platform } from '@job-tracker/shared';
import { ApplicationSchema } from '@job-tracker/shared';
import { formatDate } from '@job-tracker/shared';
```

**apps/extension에서 사용:**
```typescript
import type { Application, Platform } from '@job-tracker/shared';
import { PlatformSchema } from '@job-tracker/shared';
```

### Previous Story Intelligence

**Story 1.1에서 학습한 내용:**
- pnpm workspace 구조 정상 작동
- tsconfig.base.json extends 패턴 확립됨
- packages/shared/package.json 플레이스홀더 존재

**Story 1.2에서 학습한 내용:**
- Next.js 14.2.x + React 18.2.0 사용
- TypeScript strict mode 활성화됨

**Story 1.3에서 학습한 내용:**
- Supabase 스키마: applications 테이블 정의됨
- DB 컬럼은 snake_case (user_id, company_name 등)

**Story 1.4에서 학습한 내용:**
- Plasmo Extension 설정 완료
- TypeScript + React 18.2.0 사용

### Anti-Patterns (금지)

```typescript
// ❌ any 타입 사용 금지
export const parseData = (data: any) => {}

// ✅ 명시적 타입 사용
export const parseData = (data: Application) => {}
```

```typescript
// ❌ 상대 경로로 깊은 import 금지
import { Application } from '../../../packages/shared/src/types/application';

// ✅ workspace 경로 사용
import { Application } from '@job-tracker/shared';
```

```typescript
// ❌ I- prefix 인터페이스 금지
interface IApplication {}

// ✅ 깔끔한 네이밍
interface Application {}
```

### Commands Reference

```bash
# Shared 패키지 빌드
pnpm --filter @job-tracker/shared build

# Watch 모드
pnpm --filter @job-tracker/shared dev

# 루트에서 빌드 스크립트 추가 시
pnpm build:shared

# 전체 워크스페이스 의존성 재설치
pnpm install
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Code-Naming]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure-&-Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Architecture]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.5]

## Dev Agent Record

### Agent Model Used

(To be filled by implementing agent)

### Completion Notes List

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-04 | Story created with comprehensive context | create-story workflow |

### File List

**To be created:**
- packages/shared/package.json
- packages/shared/tsconfig.json
- packages/shared/tsup.config.ts
- packages/shared/src/index.ts
- packages/shared/src/types/index.ts
- packages/shared/src/types/application.ts
- packages/shared/src/types/platform.ts
- packages/shared/src/types/user.ts
- packages/shared/src/types/api.ts
- packages/shared/src/schemas/index.ts
- packages/shared/src/schemas/application.ts
- packages/shared/src/constants/index.ts
- packages/shared/src/constants/platforms.ts
- packages/shared/src/constants/status.ts
- packages/shared/src/utils/index.ts
- packages/shared/src/utils/date.ts

**To be modified:**
- apps/web/package.json (workspace dependency)
- apps/extension/package.json (workspace dependency)
