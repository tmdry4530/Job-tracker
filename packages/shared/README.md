# Shared Package

Extension과 Web에서 공유하는 타입, 유틸리티

## Structure

```
shared/
├── src/
│   ├── types/         # 공유 TypeScript 타입
│   │   ├── application.ts
│   │   ├── user.ts
│   │   └── index.ts
│   └── utils/         # 공유 유틸리티 함수
│       └── index.ts
├── package.json
└── tsconfig.json
```

## Usage

```typescript
// apps/web 또는 apps/extension에서
import { Application, ApplicationStatus } from '@job-tracker/shared';
```

## Key Types

```typescript
// Application - 지원 공고
interface Application {
  id: string;
  userId: string;
  platform: Platform;
  companyName: string;
  position: string;
  // ...
}

// Platform - 지원 플랫폼
type Platform = 'wanted' | 'saramin' | 'jobkorea' | 'linkedin';

// ApplicationStatus - 지원 상태
type ApplicationStatus = 
  | 'applied' 
  | 'screening' 
  | 'interview' 
  | 'offer' 
  | 'rejected' 
  | 'withdrawn';
```
