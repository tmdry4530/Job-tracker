# Story 2.4: Dashboard 인증 미들웨어

Status: done

## Story

As a **시스템**,
I want **비인증 사용자의 대시보드 접근을 차단**,
so that **인증된 사용자만 보호된 페이지에 접근할 수 있다**.

## Acceptance Criteria

1. **AC1**: 비로그인 사용자가 `/applications` 또는 `/applications/*` 경로에 접근하면 `/login`으로 리다이렉트된다
2. **AC2**: 로그인된 사용자가 보호된 경로에 접근하면 정상적으로 콘텐츠가 표시된다
3. **AC3**: 로그인된 사용자가 `/login` 또는 `/signup` 페이지에 접근하면 `/applications`로 리다이렉트된다
4. **AC4**: 미들웨어는 모든 보호된 경로(`/applications/*`)에 일관되게 적용된다
5. **AC5**: 세션 토큰 갱신(refresh)이 필요한 경우 미들웨어에서 자동으로 처리된다

## Tasks / Subtasks

- [x] Task 1: Next.js 미들웨어 파일 생성 (AC: #1, #2, #4)
  - [x] 1.1 `apps/web/src/middleware.ts` 파일 생성
  - [x] 1.2 `matcher` 설정으로 보호된 경로 정의 (`/applications/:path*`)
  - [x] 1.3 공개 경로 목록 정의 (`/login`, `/signup`, `/`, `/auth/*`, `/api/*`)

- [x] Task 2: Supabase 세션 검증 로직 구현 (AC: #1, #2, #5)
  - [x] 2.1 미들웨어용 Supabase 클라이언트 생성 함수 구현 (`updateSession`)
  - [x] 2.2 `supabase.auth.getUser()` 호출로 세션 유효성 검증
  - [x] 2.3 세션 만료 시 자동 토큰 갱신 처리

- [x] Task 3: 리다이렉트 로직 구현 (AC: #1, #3)
  - [x] 3.1 비인증 + 보호된 경로 → `/login`으로 리다이렉트
  - [x] 3.2 인증됨 + 인증 페이지 → `/applications`로 리다이렉트
  - [ ] 3.3 리다이렉트 후 원래 URL로 돌아갈 수 있도록 `redirectTo` 쿼리 파라미터 추가 (선택적) - 연기

- [x] Task 4: 미들웨어 유틸리티 파일 생성 (AC: #5)
  - [x] 4.1 `apps/web/src/lib/supabase/middleware.ts` 생성
  - [x] 4.2 미들웨어 전용 Supabase 클라이언트 + 쿠키 핸들링

- [x] Task 5: 검증
  - [x] 5.1 비로그인 상태로 `/applications` 접근 → `/login` 리다이렉트 확인
  - [x] 5.2 로그인 상태로 `/applications` 접근 → 정상 표시 확인
  - [x] 5.3 로그인 상태로 `/login` 접근 → `/applications` 리다이렉트 확인
  - [x] 5.4 타입 체크 통과
  - [x] 5.5 린트 통과
  - [x] 5.6 빌드 성공

## Dev Notes

### 기술 스택

- **Next.js Middleware**: `middleware.ts` (Edge Runtime)
- **Supabase SSR**: `@supabase/ssr` ^0.8.0 (`createServerClient`)
- **Routing**: `NextResponse.redirect()`, `NextResponse.next()`

### 핵심 구현 패턴

**1. 미들웨어 구조 (middleware.ts)**

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // 보호된 경로
    '/applications/:path*',
    // 인증 페이지 (로그인 시 리다이렉트)
    '/login',
    '/signup',
  ],
}
```

**2. Supabase 미들웨어 클라이언트 (lib/supabase/middleware.ts)**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 보호된 경로 + 비인증 → 로그인으로
  // 인증 페이지 + 인증됨 → 대시보드로
  // 리다이렉트 로직 구현

  return supabaseResponse
}
```

### 이전 스토리에서 재사용 가능한 요소

**이미 구현된 항목 (Story 2.1~2.3):**
- `apps/web/src/lib/supabase/server.ts` - Server Component용 Supabase 클라이언트
- `apps/web/src/lib/supabase/client.ts` - Client Component용 Supabase 클라이언트
- Auth 레이아웃 (`apps/web/src/app/(auth)/layout.tsx`)
- Dashboard 레이아웃 (`apps/web/src/app/(dashboard)/layout.tsx`)
- 로그인/회원가입 페이지 및 Server Actions
- 로그아웃 기능 (Header에 통합됨)

**Story 2.3 코드 리뷰에서 확인된 연기 항목:**
> AC4 미구현 (보호된 페이지 접근 제한) → **이 스토리(2.4)에서 구현**

### Project Structure Notes

**파일 위치 (Architecture 문서 준수)**
```
apps/web/src/
├── middleware.ts                    # Next.js 미들웨어 (신규)
├── lib/
│   └── supabase/
│       ├── client.ts                # 기존 - 클라이언트 컴포넌트용
│       ├── server.ts                # 기존 - 서버 컴포넌트용
│       └── middleware.ts            # 신규 - 미들웨어용
```

### Architecture References

**Architecture 문서 (architecture.md)**:
```
apps/web/src/middleware.ts       # Next.js 미들웨어 (인증 체크)
```

**epics.md - Story 2.4 요구사항:**
```
Story 2.4: Dashboard 인증 미들웨어
- Next.js Middleware: `apps/web/middleware.ts`
- Supabase `getSession()` 서버사이드 검증
- Protected routes: `/dashboard/*`
- Public routes: `/login`, `/signup`
```

**PRD (prd.md) - 관련 NFR:**
- **S3**: API 엔드포인트는 인증된 사용자만 접근 가능해야 한다
- **S5**: 사용자는 본인의 지원 데이터만 조회할 수 있어야 한다 (Row Level Security)

### 보안 고려사항

| 항목 | 처리 방법 |
|------|----------|
| **세션 검증** | `supabase.auth.getUser()` - 서버에서 JWT 검증 (getSession보다 안전) |
| **쿠키 보안** | Supabase SSR이 HttpOnly, Secure, SameSite 쿠키 자동 설정 |
| **토큰 갱신** | 미들웨어에서 자동으로 refresh token으로 새 access token 발급 |
| **CSRF 방지** | Next.js + Supabase 기본 제공 |

### Edge Cases

| 시나리오 | 처리 방법 |
|----------|----------|
| 세션 만료됨 | 자동 토큰 갱신 시도 → 실패 시 로그인 페이지 리다이렉트 |
| 잘못된 토큰 | 로그인 페이지로 리다이렉트 |
| API 경로 | 미들웨어 matcher에서 제외 (`/api/*`) |
| Static 파일 | 미들웨어 matcher에서 제외 (`/_next/*`, `/favicon.ico`) |
| auth callback | `/auth/confirm` 등 콜백 경로는 공개 유지 |

### 주의사항

1. **getSession() vs getUser()**
   - `getSession()`: 클라이언트에서 보낸 JWT만 파싱 (조작 가능)
   - `getUser()`: 서버에서 JWT 서명 검증 (권장, 더 안전)
   - 미들웨어에서는 반드시 `getUser()` 사용

2. **쿠키 동기화**
   - 미들웨어에서 쿠키를 설정하면 request와 response 모두에 반영해야 함
   - `supabaseResponse` 객체를 통해 쿠키가 올바르게 전달되도록 처리

3. **Redirect Loop 방지**
   - 로그인 페이지 자체는 미들웨어에서 리다이렉트하지 않도록 주의
   - 인증 콜백 경로(`/auth/*`)도 공개로 유지

### 테스트 시나리오

1. **비인증 사용자**
   - 브라우저 쿠키 삭제 → `/applications` 접근 → `/login`으로 리다이렉트 확인

2. **인증된 사용자**
   - 로그인 후 → `/applications` 접근 → 정상 페이지 표시
   - 로그인 상태에서 → `/login` 접근 → `/applications`로 리다이렉트

3. **세션 만료**
   - 장시간 미사용 후 → `/applications` 접근 → 자동 토큰 갱신 또는 로그인 리다이렉트

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure-Boundaries]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.4]
- [Source: _bmad-output/planning-artifacts/prd.md#Security]
- [Supabase SSR 공식 문서: Server-side Auth](https://supabase.com/docs/guides/auth/server-side)
- [Next.js Middleware 공식 문서](https://nextjs.org/docs/app/building-your-application/routing/middleware)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Next.js 미들웨어 (`middleware.ts`) 생성 - Edge Runtime 호환
- 미들웨어 전용 Supabase 클라이언트 (`lib/supabase/middleware.ts`) 구현
- `getUser()` 메서드로 안전한 JWT 서명 검증
- 쿠키 동기화 패턴 (request + response 모두 처리)
- 보호된 경로 (`/applications/*`) 접근 제어
- 인증된 사용자의 인증 페이지 접근 시 대시보드로 리다이렉트
- shared 패키지 빌드 후 web 앱 빌드 성공
- 린트 통과

### File List

- `apps/web/src/middleware.ts` (신규)
- `apps/web/src/lib/supabase/middleware.ts` (신규)

## Code Review Record

### Review Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Issues Found

| # | 심각도 | 설명 | 조치 |
|---|--------|------|------|
| 1 | INFO | Edge Runtime 경고 (Supabase SSR) | 알려진 경고, 동작 영향 없음 - 수용 |
| 2 | LOW | API 경로 명시적 제외 없음 | 보호 경로 아니므로 통과됨 - 수용 |

### Fixes Applied

없음 - 심각한 이슈 없음

### Deferred Items

- `redirectTo` 쿼리 파라미터 (로그인 후 원래 페이지로 복귀) - 선택적 기능, 추후 구현 가능
