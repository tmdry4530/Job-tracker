# Story 2.2: 이메일/비밀번호 로그인

Status: done

## Story

As a **사용자**,
I want **이메일과 비밀번호로 로그인**,
so that **대시보드에 접근하여 지원 현황을 관리할 수 있다**.

## Acceptance Criteria

1. **AC1**: 등록된 이메일과 올바른 비밀번호를 입력하면 Supabase 세션이 생성된다
2. **AC2**: 로그인 성공 시 대시보드 페이지(`/applications`)로 리다이렉트된다
3. **AC3**: 세션 토큰이 쿠키에 저장된다 (`sb-access-token`, `sb-refresh-token`)
4. **AC4**: 잘못된 이메일 또는 비밀번호 입력 시 에러 메시지가 표시된다
5. **AC5**: 이메일 미확인 사용자 로그인 시도 시 적절한 안내 메시지가 표시된다
6. **AC6**: 로그인 폼에 유효성 검증이 적용된다 (이메일 형식, 비밀번호 필수)

## Tasks / Subtasks

- [x] Task 1: 로그인 Server Action 구현 (AC: #1, #3, #4, #5)
  - [x] 1.1 `apps/web/src/app/(auth)/login/actions.ts` 생성
  - [x] 1.2 signIn 함수 구현 (Supabase Auth signInWithPassword 호출)
  - [x] 1.3 에러 핸들링 (잘못된 자격 증명, 이메일 미확인 등)

- [x] Task 2: 로그인 UI 구현 (AC: #2, #4, #6)
  - [x] 2.1 `apps/web/src/components/features/auth/login-form.tsx` 생성
  - [x] 2.2 로그인 폼 컴포넌트 구현 (이메일, 비밀번호 입력)
  - [x] 2.3 클라이언트 사이드 유효성 검증 (LoginSchema 사용)
  - [x] 2.4 로딩 상태 및 에러 메시지 표시
  - [x] 2.5 로그인 성공 시 리다이렉트 처리

- [x] Task 3: 로그인 페이지 업데이트 (AC: #2)
  - [x] 3.1 `apps/web/src/app/(auth)/login/page.tsx` 업데이트
  - [x] 3.2 LoginForm 컴포넌트 연결
  - [x] 3.3 회원가입 페이지 링크 추가

- [x] Task 4: 검증
  - [x] 4.1 타입 체크 통과
  - [x] 4.2 린트 통과
  - [x] 4.3 빌드 성공

## Dev Notes

### 기술 스택
- **Supabase Auth**: `@supabase/ssr` ^0.8.0 (`signInWithPassword` 메서드)
- **Validation**: Zod ^3.x (`LoginSchema` - Story 2.1에서 이미 정의됨)
- **UI**: shadcn/ui (Button, Input, Label, Card) - Story 2.1에서 생성됨
- **Routing**: Next.js App Router (`redirect`, `useRouter`)

### 핵심 구현 패턴

**1. Login Server Action**
```typescript
// apps/web/src/app/(auth)/login/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { LoginSchema, type AuthResponse } from '@job-tracker/shared'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData): Promise<AuthResponse> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  // Zod validation
  const result = LoginSchema.safeParse(rawData)
  if (!result.success) {
    const errors = result.error.errors.map((e) => e.message).join(', ')
    return { error: errors }
  }

  const { email, password } = result.data
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // 에러 유형별 처리
    if (error.message.includes('Invalid login credentials')) {
      return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.' }
    }
    return { error: error.message }
  }

  redirect('/applications')
}
```

**2. LoginForm 컴포넌트**

> 참고: 전체 구현은 `apps/web/src/components/features/auth/login-form.tsx` 파일을 확인하세요.
> SignupForm과 동일한 패턴으로 구현되었습니다.

### 이전 스토리(2.1)에서 재사용 가능한 요소

**이미 구현된 항목:**
- `@job-tracker/shared`의 `LoginSchema` (Zod 스키마)
- `@job-tracker/shared`의 `AuthResponse` 타입
- `apps/web/src/lib/supabase/server.ts` (Supabase 서버 클라이언트)
- shadcn/ui 컴포넌트 (Button, Input, Label, Card)
- Auth 레이아웃 (`apps/web/src/app/(auth)/layout.tsx`)

### Project Structure Notes

**파일 위치 (Architecture 문서 준수)**
```
apps/web/src/
├── app/
│   └── (auth)/
│       └── login/
│           ├── page.tsx         # 로그인 페이지 (업데이트)
│           └── actions.ts       # Server Action (신규)
└── components/
    └── features/
        └── auth/
            ├── signup-form.tsx  # Story 2.1에서 생성
            └── login-form.tsx   # 로그인 폼 (신규)
```

### 에러 메시지 처리

| Supabase 에러 | 한국어 메시지 |
|--------------|--------------|
| `Invalid login credentials` | 이메일 또는 비밀번호가 올바르지 않습니다. |
| `Email not confirmed` | 이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요. |
| 기타 에러 | 원본 에러 메시지 표시 |

### 보안 고려사항

- **Rate Limiting**: Supabase 기본 제공 (로그인 시도 제한)
- **세션 관리**: Supabase Auth가 쿠키 기반 세션 자동 관리
- **PKCE Flow**: `@supabase/ssr`이 자동으로 PKCE 처리

### UI/UX 가이드라인

- 로딩 중 버튼 비활성화 및 스피너 표시
- 에러 메시지는 폼 상단 또는 필드 아래에 표시
- "비밀번호 찾기" 링크는 Story 2.2 범위 외 (추후 구현)
- 로그인 성공 시 즉시 대시보드로 이동 (redirect 사용)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication-Security]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.2]
- [Source: _bmad-output/planning-artifacts/prd.md#FR2]
- [Story 2.1 구현 참조: apps/web/src/components/features/auth/signup-form.tsx]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Story 2.1에서 구현된 LoginSchema, AuthResponse 타입 재사용
- SignupForm과 동일한 패턴으로 LoginForm 구현 (일관성 유지)
- Server Action에서 redirect() 호출하여 로그인 성공 시 /applications로 이동
- 에러 메시지 한국어화 (Invalid login credentials, Email not confirmed)
- 클라이언트/서버 양쪽 Zod 유효성 검증 적용
- 타입 체크, 린트, 빌드 모두 통과

### File List

- `apps/web/src/app/(auth)/login/page.tsx` (수정)
- `apps/web/src/app/(auth)/login/actions.ts` (신규)
- `apps/web/src/components/features/auth/login-form.tsx` (신규)
- `packages/shared/src/schemas/auth.ts` (수정 - 주석 추가)

## Senior Developer Review (AI)

### Reviewer
Claude Opus 4.5 | 2026-01-04

### Review Outcome
**APPROVED** - 3개 이슈 수정 완료

### Issues Found & Fixed

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | HIGH | 스토리 Dev Notes의 코드 예시와 실제 구현 불일치 | Dev Notes에서 불완전한 코드 예시 제거, 파일 참조로 대체 |
| 2 | MEDIUM | AuthResponse 타입 vs 프로젝트 API 표준 불일치 | auth.ts에 Auth 전용 응답 형식임을 명시하는 주석 추가 |
| 3 | MEDIUM | redirect() 동작에 대한 명확성 부족 | actions.ts에 redirect() 동작 설명 주석 추가 |

### Remaining Low Issues (Optional)
- 컴포넌트 파일명이 kebab-case (`login-form.tsx`) - Story 2.1과 일관성 유지를 위해 그대로 유지
- 테스트 파일 없음 - 테스트 프레임워크(Vitest) 설정이 필요함 (별도 스토리로 분리 권장)

### Validation
- ✅ 타입 체크 통과
- ✅ 린트 통과
- ✅ 빌드 성공
