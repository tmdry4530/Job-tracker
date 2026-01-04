# Story 1.1: 모노레포 구조 초기화

Status: done

## Story

As a **개발자**,
I want **pnpm workspace 기반 모노레포 구조를 설정하여**,
so that **Extension과 Web 앱을 효율적으로 관리할 수 있다**.

## Acceptance Criteria

1. **pnpm-workspace.yaml 생성**
   - Given 프로젝트 루트 디렉토리가 있을 때
   - When 모노레포 구조를 초기화하면
   - Then pnpm-workspace.yaml이 생성되고 apps/*, packages/* 경로가 정의된다

2. **디렉토리 구조 생성**
   - Given pnpm-workspace.yaml이 있을 때
   - When 워크스페이스 디렉토리를 생성하면
   - Then apps/extension, apps/web, packages/shared 디렉토리가 생성된다

3. **루트 package.json 스크립트**
   - Given 워크스페이스 구조가 있을 때
   - When 루트 package.json을 설정하면
   - Then dev, dev:web, dev:extension, build, lint, test 스크립트가 정의된다

4. **pnpm install 성공**
   - Given 모든 워크스페이스가 설정되었을 때
   - When pnpm install을 실행하면
   - Then 모든 워크스페이스에서 의존성 설치가 성공한다
   - And pnpm-lock.yaml이 생성된다

## Tasks / Subtasks

- [x] Task 1: 루트 설정 (AC: #1, #3)
  - [x] 1.1 pnpm-workspace.yaml 생성
  - [x] 1.2 루트 package.json 생성 (workspaces 스크립트 포함)
  - [x] 1.3 .gitignore 생성 (node_modules, .env, build 아티팩트)
  - [x] 1.4 .nvmrc 생성 (Node 20+)

- [x] Task 2: 디렉토리 구조 생성 (AC: #2)
  - [x] 2.1 apps/extension 디렉토리 생성
  - [x] 2.2 apps/web 디렉토리 생성
  - [x] 2.3 packages/shared 디렉토리 생성

- [x] Task 3: TypeScript 공통 설정
  - [x] 3.1 루트 tsconfig.json 생성 (공통 설정)
  - [x] 3.2 tsconfig.base.json 생성 (확장용)

- [x] Task 4: 각 워크스페이스 기본 package.json (AC: #4)
  - [x] 4.1 apps/extension/package.json 생성 (플레이스홀더)
  - [x] 4.2 apps/web/package.json 생성 (플레이스홀더)
  - [x] 4.3 packages/shared/package.json 생성 (플레이스홀더)

- [x] Task 5: 검증 (AC: #4)
  - [x] 5.1 pnpm install 실행 및 성공 확인
  - [x] 5.2 워크스페이스 인식 확인 (pnpm -r exec pwd)

## Dev Notes

### Critical Technical Requirements

**Version Constraints (MUST FOLLOW):**
```json
{
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.15.0"
  }
}
```

**pnpm Workspace Configuration:**
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Root package.json Structure:**
```json
{
  "name": "job-application-tracker",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "dev:web": "pnpm --filter web dev",
    "dev:extension": "pnpm --filter extension dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "type-check": "pnpm -r type-check"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.15.0"
  }
}
```

### Project Structure Notes

**Target Directory Structure:**
```
job-application-tracker/
├── pnpm-workspace.yaml
├── package.json            # 루트 워크스페이스
├── pnpm-lock.yaml
├── tsconfig.json           # 공통 TS 설정
├── tsconfig.base.json      # 확장용 기본 설정
├── .gitignore
├── .nvmrc                  # Node 버전 고정
├── apps/
│   ├── extension/
│   │   └── package.json    # 플레이스홀더
│   └── web/
│       └── package.json    # 플레이스홀더
└── packages/
    └── shared/
        └── package.json    # 플레이스홀더
```

**TypeScript Base Configuration:**
```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

### Security Considerations

- CVE-2025-55182: React 19 / Next.js 15+ 사용 금지
- 이 스토리에서는 직접적 영향 없음 (다음 스토리에서 버전 고정)

### Anti-Patterns (금지)

```bash
# ❌ npm/yarn 사용 금지
npm install  # 금지
yarn install # 금지

# ✅ pnpm만 사용
pnpm install
```

```json
// ❌ 글로벌 의존성 설치 금지 (루트 package.json)
{
  "dependencies": { ... }  // 금지
}

// ✅ 워크스페이스별 의존성
// apps/web/package.json, apps/extension/package.json에서 관리
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Starter-Template-Evaluation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure-&-Boundaries]
- [Source: _bmad-output/project-context.md#Technology-Stack-&-Versions]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.1]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- pnpm-workspace.yaml 이미 존재, apps/*, packages/* 구성 확인
- package.json의 pnpm 버전 제약을 >=8.0.0에서 >=8.15.0으로 수정
- .nvmrc 파일 생성 (Node 20)
- tsconfig.json, tsconfig.base.json 생성 (strict mode 활성화)
- 워크스페이스별 placeholder package.json 생성
- pnpm install 성공, 모든 워크스페이스 인식 확인

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-04 | Story created | create-story workflow |
| 2026-01-04 | Implementation completed | Claude Opus 4.5 |

### File List

**Created:**
- .nvmrc
- tsconfig.json
- tsconfig.base.json
- apps/extension/package.json
- apps/web/package.json
- packages/shared/package.json

**Modified:**
- package.json (pnpm version constraint)
