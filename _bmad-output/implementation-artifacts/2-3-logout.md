# Story 2.3: 로그아웃

Status: done

## Story

As a **사용자**,
I want **로그아웃하여 세션을 종료**,
so that **내 계정을 안전하게 보호하고 다른 계정으로 전환할 수 있다**.

## Acceptance Criteria

1. **AC1**: 로그아웃 버튼을 클릭하면 Supabase 세션이 종료된다
2. **AC2**: 세션 쿠키가 삭제된다 (`sb-access-token`, `sb-refresh-token`)
3. **AC3**: 로그아웃 성공 시 로그인 페이지(`/login`)로 리다이렉트된다
4. **AC4**: 로그아웃 후 보호된 페이지(`/applications`) 접근 시 로그인 페이지로 리다이렉트된다

## Tasks / Subtasks

- [x] Task 1: 로그아웃 Server Action 구현 (AC: #1, #2, #3)
  - [x] 1.1 `apps/web/src/app/(auth)/logout/actions.ts` 생성
  - [x] 1.2 signOut 함수 구현 (Supabase Auth signOut 호출)
  - [x] 1.3 세션 종료 후 /login으로 리다이렉트

- [x] Task 2: 로그아웃 버튼 UI 구현 (AC: #1, #3)
  - [x] 2.1 `apps/web/src/components/features/auth/logout-button.tsx` 생성
  - [x] 2.2 로그아웃 버튼 컴포넌트 구현
  - [x] 2.3 로딩 상태 표시

- [x] Task 3: 대시보드 헤더에 로그아웃 버튼 통합 (AC: #1)
  - [x] 3.1 `apps/web/src/components/layouts/header.tsx` 생성 또는 수정
  - [x] 3.2 LogoutButton 컴포넌트 헤더에 추가
  - [x] 3.3 사용자 정보 표시 (선택적)

- [x] Task 4: 검증
  - [x] 4.1 타입 체크 통과
  - [x] 4.2 린트 통과
  - [x] 4.3 빌드 성공

## Dev Notes

### 기술 스택
- **Supabase Auth**: `@supabase/ssr` ^0.8.0 (`signOut` 메서드)
- **UI**: shadcn/ui (Button) - Story 2.1에서 이미 설치됨
- **Routing**: Next.js App Router (`redirect`)

### 핵심 구현 패턴

**1. Logout Server Action**

> 참고: 전체 구현은 `apps/web/src/app/(auth)/logout/actions.ts` 파일을 확인하세요.

**2. LogoutButton 컴포넌트**

> 참고: 전체 구현은 `apps/web/src/components/features/auth/logout-button.tsx` 파일을 확인하세요.

### 이전 스토리에서 재사용 가능한 요소

**이미 구현된 항목:**
- `apps/web/src/lib/supabase/server.ts` (Supabase 서버 클라이언트)
- shadcn/ui Button 컴포넌트
- Auth 레이아웃 (`apps/web/src/app/(auth)/layout.tsx`)
- 인증 미들웨어 (Story 2.4에서 구현 예정 - 현재는 기본 동작)

### Project Structure Notes

**파일 위치 (Architecture 문서 준수)**
```
apps/web/src/
├── app/
│   └── (auth)/
│       └── logout/
│           └── actions.ts       # Server Action (신규)
├── components/
│   ├── features/
│   │   └── auth/
│   │       ├── signup-form.tsx  # Story 2.1
│   │       ├── login-form.tsx   # Story 2.2
│   │       └── logout-button.tsx # 로그아웃 버튼 (신규)
│   └── layouts/
│       └── header.tsx           # 헤더 (신규 또는 수정)
```

### Architecture References

**FR3 구현 (epics.md)**:
> Story 2.3: 로그아웃
> - Supabase `signOut()` 메서드 사용
> - Extension에도 로그아웃 이벤트 전파 (chrome.storage.local 클리어)
> - React Query 캐시 클리어

**Note**: Extension 세션 공유 및 React Query 캐시 클리어는 Story 2.5 범위입니다.
현재 스토리에서는 Dashboard 로그아웃만 구현합니다.

### 보안 고려사항

- **세션 무효화**: Supabase가 서버 측에서 세션 토큰을 무효화
- **쿠키 삭제**: `@supabase/ssr`이 자동으로 인증 쿠키 삭제 처리
- **Refresh Token**: signOut()이 refresh token도 함께 무효화

### UI/UX 가이드라인

- 로그아웃 버튼은 헤더 우측에 배치
- 클릭 시 로딩 상태 표시 ("로그아웃 중...")
- 로그아웃 완료 후 즉시 로그인 페이지로 이동
- 확인 다이얼로그는 MVP 범위 외 (간단한 UX 유지)

### Edge Cases

| 시나리오 | 처리 방법 |
|----------|----------|
| 세션 이미 만료 | 에러 무시, 로그인 페이지로 이동 |
| 네트워크 오류 | 재시도 또는 강제 로그아웃 |
| 동시 로그아웃 요청 | 첫 번째 요청만 처리 (isLoading 상태) |

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication-Security]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR3]
- [Story 2.2 참조: apps/web/src/app/(auth)/login/actions.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Supabase Auth signOut() 메서드를 사용한 Server Action 구현
- LogoutButton 클라이언트 컴포넌트 생성 (로딩 상태 포함)
- Header 레이아웃 컴포넌트 생성 및 대시보드 레이아웃에 통합
- redirect()가 예외를 던지는 동작에 대한 적절한 처리
- 타입 체크, 린트, 빌드 모두 통과

### File List

- `apps/web/src/app/(auth)/logout/actions.ts` (신규)
- `apps/web/src/components/features/auth/logout-button.tsx` (신규)
- `apps/web/src/components/layouts/header.tsx` (신규)
- `apps/web/src/app/(dashboard)/layout.tsx` (수정)

## Code Review Record

### Review Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Issues Found

| # | 심각도 | 설명 | 조치 |
|---|--------|------|------|
| 1 | HIGH | AC4 미구현 (보호된 페이지 접근 제한) | Story 2.4 범위 - 미들웨어 구현 예정 |
| 2 | MEDIUM | isLoading이 네트워크 오류 시 고착 가능 | ✅ finally 블록 추가로 수정 |
| 3 | MEDIUM | 테스트 파일 없음 | 연기 - Vitest 설정 필요 |
| 4 | MEDIUM | 로그아웃 실패 시 사용자 피드백 없음 | ✅ 에러 상태 추가로 수정 |
| 5 | LOW | header.tsx 파일명 규칙 | 유지 - 기존 패턴 준수 |
| 6 | LOW | 빈 에러 핸들링 블록 | ✅ console.error 로깅 추가 |

### Fixes Applied

1. **LogoutButton 개선** (`logout-button.tsx`)
   - `error` 상태 추가하여 사용자에게 오류 피드백 제공
   - `finally` 블록으로 isLoading 상태 항상 복구
   - NEXT_REDIRECT 에러와 실제 네트워크 에러 구분

2. **Server Action 개선** (`actions.ts`)
   - 에러 발생 시 console.error 로깅 추가
   - TODO 주석으로 프로덕션 로깅 서비스 도입 필요 명시

### Deferred Items

- **AC4**: 미들웨어 기반 보호된 경로 접근 제한은 Story 2.4에서 구현
- **테스트**: Vitest 설정 후 별도 태스크로 진행
