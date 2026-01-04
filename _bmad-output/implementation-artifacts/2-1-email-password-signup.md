# Story 2.1: 이메일/비밀번호 회원가입

Status: done

## Story

As a **사용자**,
I want **이메일과 비밀번호로 회원가입**,
so that **서비스를 이용할 수 있다**.

## Acceptance Criteria

1. **AC1**: 유효한 이메일과 비밀번호(8자 이상)를 입력하고 제출하면 Supabase Auth에 계정이 생성된다
2. **AC2**: 회원가입 성공 시 이메일 확인 메일이 발송된다
3. **AC3**: 회원가입 성공 메시지가 화면에 표시된다
4. **AC4**: 잘못된 이메일 형식 입력 시 유효성 검증 에러가 표시된다
5. **AC5**: 비밀번호가 8자 미만일 경우 유효성 검증 에러가 표시된다
6. **AC6**: 이미 등록된 이메일로 가입 시도 시 에러 메시지가 표시된다

## Tasks / Subtasks

- [x] Task 1: Supabase 클라이언트 설정 (AC: #1)
  - [x] 1.1 `apps/web/src/lib/supabase/client.ts` 생성 (브라우저용) - Epic 1에서 완료
  - [x] 1.2 `apps/web/src/lib/supabase/server.ts` 생성 (서버용) - Epic 1에서 완료
  - [x] 1.3 환경변수 설정 확인 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

- [x] Task 2: Zod 스키마 정의 (AC: #4, #5)
  - [x] 2.1 `packages/shared/src/schemas/auth.ts` 생성 (공유 패키지에 추가)
  - [x] 2.2 SignupSchema, LoginSchema 정의 (이메일 형식, 비밀번호 8자 이상)

- [x] Task 3: 회원가입 Server Action 구현 (AC: #1, #2, #6)
  - [x] 3.1 `apps/web/src/app/(auth)/signup/actions.ts` 생성
  - [x] 3.2 signUp 함수 구현 (Supabase Auth signUp 호출)
  - [x] 3.3 에러 핸들링 (중복 이메일 등)

- [x] Task 4: 회원가입 UI 구현 (AC: #3, #4, #5)
  - [x] 4.1 Auth 레이아웃 - Epic 1에서 완료
  - [x] 4.2 회원가입 페이지 `apps/web/src/app/(auth)/signup/page.tsx` 업데이트
  - [x] 4.3 폼 컴포넌트 `apps/web/src/components/features/auth/signup-form.tsx` 구현
  - [x] 4.4 클라이언트 사이드 유효성 검증 표시
  - [x] 4.5 로딩 상태 및 성공/에러 메시지 표시

- [x] Task 5: 이메일 확인 콜백 라우트 (AC: #2)
  - [x] 5.1 `apps/web/src/app/auth/confirm/route.ts` 생성
  - [x] 5.2 token_hash 검증 및 세션 생성
  - [x] 5.3 `apps/web/src/app/auth/error/page.tsx` 에러 페이지 생성

- [x] Task 6: 검증
  - [x] 6.1 타입 체크 통과
  - [x] 6.2 린트 통과
  - [x] 6.3 빌드 성공

## Dev Notes

### 기술 스택
- **Supabase Auth**: `@supabase/ssr` ^0.8.0 사용 (auth-helpers-nextjs는 deprecated)
- **Validation**: Zod ^3.x
- **UI**: shadcn/ui (Button, Input, Label, Card)
- **Forms**: React Hook Form (선택적) 또는 기본 form action

### 핵심 구현 패턴

**1. Supabase 클라이언트 (브라우저용)**
```typescript
// apps/web/src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**2. Supabase 클라이언트 (서버용)**
```typescript
// apps/web/src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
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
            // Server Component에서 호출 시 무시 (proxy refreshing)
          }
        },
      },
    }
  )
}
```

**3. SignUp Server Action**
```typescript
// apps/web/src/app/(auth)/signup/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: '확인 이메일을 발송했습니다.' }
}
```

**4. Zod 스키마 (Shared 패키지)**
```typescript
// packages/shared/src/schemas/auth.ts
import { z } from 'zod'

export const SignupSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
})

export type SignupInput = z.infer<typeof SignupSchema>
```

### Project Structure Notes

**파일 위치 (Architecture 문서 준수)**
```
packages/shared/src/
└── schemas/
    └── auth.ts                  # Zod 스키마 (공유)

apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx           # Auth 전용 레이아웃 (센터 정렬)
│   │   ├── signup/
│   │   │   ├── page.tsx         # 회원가입 페이지
│   │   │   └── actions.ts       # Server Action
│   │   └── login/               # Story 2.2에서 구현
│   └── auth/
│       ├── confirm/
│       │   └── route.ts         # 이메일 확인 콜백
│       └── error/
│           └── page.tsx         # 에러 페이지
├── components/
│   ├── features/
│   │   └── auth/
│   │       └── signup-form.tsx  # 회원가입 폼 컴포넌트
│   └── ui/                      # shadcn/ui 컴포넌트
└── lib/
    └── supabase/
        ├── client.ts            # 브라우저용 클라이언트
        └── server.ts            # 서버용 클라이언트
```

### 환경변수 요구사항

`.env.local` 파일에 다음 변수 필요:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 보안 고려사항

- **S2 충족**: 비밀번호 해시는 Supabase Auth에서 자동 처리
- **HTTPS**: 프로덕션에서 Vercel 자동 HTTPS (S1)
- **Rate Limiting**: Supabase 기본 제공 (4 emails/hour 기본)

### UI/UX 가이드라인

- 로딩 중 버튼 비활성화 및 스피너 표시
- 에러 메시지는 입력 필드 아래에 빨간색 텍스트로 표시
- 성공 시 "이메일을 확인해주세요" 메시지 표시
- 모바일 반응형 디자인

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication-Security]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.1]
- [Source: _bmad-output/planning-artifacts/prd.md#FR1]
- [Supabase SSR Docs: @supabase/ssr package]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Supabase 클라이언트는 Epic 1에서 이미 구현됨 (client.ts, server.ts)
- Zod 스키마는 공유 패키지(`@job-tracker/shared`)에 추가하여 Extension과 공유 가능하도록 함
- shadcn/ui 컴포넌트(Button, Input, Label, Card)를 수동 생성
- 이메일 확인 에러 페이지 추가 구현

### File List

- `packages/shared/src/schemas/auth.ts` (신규)
- `packages/shared/src/schemas/index.ts` (수정)
- `apps/web/src/app/(auth)/signup/page.tsx` (수정)
- `apps/web/src/app/(auth)/signup/actions.ts` (신규)
- `apps/web/src/app/auth/confirm/route.ts` (신규)
- `apps/web/src/app/auth/error/page.tsx` (신규)
- `apps/web/src/components/features/auth/signup-form.tsx` (신규)
- `apps/web/src/components/ui/button.tsx` (신규)
- `apps/web/src/components/ui/input.tsx` (신규)
- `apps/web/src/components/ui/label.tsx` (신규)
- `apps/web/src/components/ui/card.tsx` (신규)

## Senior Developer Review (AI)

### Reviewer
Claude Opus 4.5 | 2026-01-04

### Review Outcome
**APPROVED** - All issues fixed

### Issues Found & Fixed

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 3 | HIGH | 이메일 확인 라우트 타입 불안전 (`type as ...` 사용) | `isValidOtpType()` 타입 가드 함수 추가 |
| 5 | MEDIUM | Input에 `required` 속성 누락 | `required`, `minLength`, `autoComplete` 속성 추가 |
| 6 | MEDIUM | 환경변수 미설정 시 에러 처리 없음 | `getBaseUrl()` 함수로 Vercel 환경 감지 및 기본값 처리 |
| 7 | MEDIUM | Dev Notes 코드 예시와 실제 구현 불일치 | 문서 업데이트 (Zod 스키마 위치 수정) |

### Remaining Low Issues (Optional)
- 에러 페이지 버튼 스타일 중복 → `buttonVariants` 사용 권장
- 로딩 스피너 SVG 컴포넌트화 권장
- 비밀번호 최대 길이 제한 검토

### Validation
- ✅ 타입 체크 통과
- ✅ 린트 통과
- ✅ 빌드 성공
