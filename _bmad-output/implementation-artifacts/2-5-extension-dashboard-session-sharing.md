# Story 2.5: Extension-Dashboard 세션 공유

Status: done

## Story

As a **사용자**,
I want **Dashboard에서 로그인하면 Extension에서도 자동으로 인증된 상태를 유지**,
so that **별도 로그인 없이 Extension에서 데이터 수집 및 동기화를 할 수 있다**.

## Acceptance Criteria

1. **AC1**: Dashboard에서 로그인 성공 시 세션 토큰이 `chrome.storage.local`에 저장된다
2. **AC2**: Extension이 활성화되면 `chrome.storage.local`에서 세션 토큰을 읽어온다
3. **AC3**: Extension에서 인증된 Supabase API 호출이 가능하다
4. **AC4**: Dashboard에서 로그아웃 시 Extension의 세션도 함께 클리어된다
5. **AC5**: 세션 만료 시 Extension Popup에 재인증 요청 메시지가 표시된다
6. **AC6**: Extension Popup에서 현재 로그인 상태를 확인할 수 있다

## Tasks / Subtasks

- [x] Task 1: Dashboard 로그인 시 Extension에 세션 전달 (AC: #1)
  - [x] 1.1 SessionSync 컴포넌트에서 onAuthStateChange로 세션 감지 및 localStorage 저장
  - [x] 1.2 Content Script가 localStorage 변경 감지하여 Background로 전달
  - [x] 1.3 Background가 chrome.storage.local에 세션 저장

- [x] Task 2: Extension Background Service 세션 관리 (AC: #2, #3)
  - [x] 2.1 `apps/extension/background.ts` 확장 - 세션 로드 및 관리 로직
  - [x] 2.2 `chrome.storage.onChanged` 리스너로 세션 변경 감지
  - [x] 2.3 Extension용 Supabase 클라이언트 생성 (`apps/extension/lib/supabase.ts`)
  - [x] 2.4 세션 토큰으로 Supabase 클라이언트 인증 설정

- [x] Task 3: Dashboard 로그아웃 시 Extension 세션 클리어 (AC: #4)
  - [x] 3.1 SessionSync에서 null 세션 감지 시 localStorage.removeItem 호출
  - [x] 3.2 Content Script → Background → chrome.storage.local.remove 체인 동작

- [x] Task 4: Extension Popup UI 업데이트 (AC: #5, #6)
  - [x] 4.1 `apps/extension/popup.tsx` 수정 - 로그인 상태 표시
  - [x] 4.2 세션 있음: "로그인됨 (이메일)" 표시
  - [x] 4.3 세션 없음/만료: "로그인 필요" 메시지 + 대시보드 링크
  - [x] 4.4 대시보드 열기 버튼 동작 구현 (`chrome.tabs.create`)

- [x] Task 5: 세션 유효성 검증 (AC: #5)
  - [ ] 5.1 Background에서 주기적 세션 검증 (선택적) - 연기
  - [x] 5.2 Popup 열 때 세션 유효성 확인 (isSessionExpired)
  - [x] 5.3 만료된 세션 감지 시 UI 업데이트

- [x] Task 6: 검증
  - [x] 6.1 Dashboard 로그인 → Extension Popup에서 로그인 상태 확인
  - [x] 6.2 Dashboard 로그아웃 → Extension Popup에서 로그아웃 상태 확인
  - [x] 6.3 Extension 빌드 성공
  - [x] 6.4 Web 앱 빌드 성공
  - [x] 6.5 린트 통과

## Dev Notes

### 기술 스택

- **Chrome Extension APIs**: `chrome.storage.local`, `chrome.storage.onChanged`, `chrome.tabs.create`
- **Supabase Client**: `@supabase/supabase-js` (Extension용)
- **Plasmo Framework**: Background Service Worker, Popup
- **React**: Popup UI 상태 관리

### 핵심 구현 패턴

**1. Dashboard → Extension 세션 전달 (Web 측)**

```typescript
// apps/web/src/lib/extension/session.ts
export async function syncSessionToExtension(session: Session | null) {
  // Chrome Extension이 설치된 환경인지 확인
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.log('Chrome Extension not available')
    return
  }

  if (session) {
    await chrome.storage.local.set({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: {
          id: session.user.id,
          email: session.user.email,
        }
      }
    })
  } else {
    await chrome.storage.local.remove(['session'])
  }
}
```

**2. Extension Background 세션 관리**

```typescript
// apps/extension/background.ts
import { createClient } from '@supabase/supabase-js'

let supabase: ReturnType<typeof createClient> | null = null

// 세션 변경 감지
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.session) {
    const newSession = changes.session.newValue
    if (newSession) {
      initSupabaseWithSession(newSession)
    } else {
      supabase = null
    }
  }
})

// 세션으로 Supabase 클라이언트 초기화
function initSupabaseWithSession(session: StoredSession) {
  supabase = createClient(
    process.env.PLASMO_PUBLIC_SUPABASE_URL!,
    process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  )

  // 세션 토큰 설정
  supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
}

// 초기 세션 로드
chrome.storage.local.get(['session'], (result) => {
  if (result.session) {
    initSupabaseWithSession(result.session)
  }
})
```

**3. Extension Popup 상태 표시**

```tsx
// apps/extension/popup.tsx
import { useEffect, useState } from 'react'

interface StoredSession {
  access_token: string
  refresh_token: string
  expires_at: number
  user: {
    id: string
    email: string
  }
}

function IndexPopup() {
  const [session, setSession] = useState<StoredSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 세션 로드
    chrome.storage.local.get(['session'], (result) => {
      setSession(result.session || null)
      setLoading(false)
    })

    // 세션 변경 감지
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.session) {
        setSession(changes.session.newValue || null)
      }
    }
    chrome.storage.onChanged.addListener(listener)

    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const openDashboard = () => {
    chrome.tabs.create({
      url: process.env.PLASMO_PUBLIC_DASHBOARD_URL
    })
  }

  if (loading) {
    return <div>로딩 중...</div>
  }

  return (
    <div className="w-80 p-4 bg-white">
      <h1 className="text-lg font-bold">Job Application Tracker</h1>

      {session ? (
        <div className="mt-4 text-sm text-green-600">
          ✓ 로그인됨: {session.user.email}
        </div>
      ) : (
        <div className="mt-4 text-sm text-gray-500">
          로그인이 필요합니다
        </div>
      )}

      <button
        onClick={openDashboard}
        className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md"
      >
        {session ? '대시보드 열기' : '로그인하기'}
      </button>
    </div>
  )
}
```

### 이전 스토리에서 재사용 가능한 요소

**이미 구현된 항목 (Story 2.1~2.4):**
- `apps/web/src/lib/supabase/client.ts` - Web 클라이언트 Supabase
- `apps/web/src/lib/supabase/server.ts` - Server Component Supabase
- `apps/web/src/app/(auth)/login/actions.ts` - 로그인 Server Action
- `apps/web/src/app/(auth)/logout/actions.ts` - 로그아웃 Server Action
- `apps/extension/background.ts` - 기본 Background Service (스켈레톤)
- `apps/extension/popup.tsx` - 기본 Popup UI (스켈레톤)

**Story 2.3에서 언급된 연기 항목:**
> Extension에도 로그아웃 이벤트 전파 (chrome.storage.local 클리어) → **이 스토리에서 구현**

### Project Structure Notes

**파일 위치 (Architecture 문서 준수)**
```
apps/
├── web/src/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts          # 기존
│   │   │   └── server.ts          # 기존
│   │   └── extension/
│   │       └── session.ts         # 신규 - Extension 세션 동기화 유틸
│   └── app/(auth)/
│       ├── login/
│       │   └── actions.ts         # 수정 - 세션 동기화 추가
│       └── logout/
│           └── actions.ts         # 수정 - 세션 클리어 추가
│
├── extension/
│   ├── background.ts              # 수정 - 세션 관리 로직 추가
│   ├── popup.tsx                  # 수정 - 로그인 상태 표시
│   └── lib/
│       └── supabase.ts            # 신규 - Extension용 Supabase 클라이언트
```

### Architecture References

**Architecture 문서 (architecture.md) - Extension ↔ Dashboard 인증 흐름:**
```
1. Dashboard에서 Supabase Auth 로그인
2. 로그인 성공 → access_token을 chrome.storage.local에 저장
3. Extension에서 chrome.storage.local에서 토큰 읽기
4. Extension이 Supabase Client에 토큰 설정
5. 이후 Extension ↔ Supabase 직접 통신
```

**epics.md - Story 2.5 기술 노트:**
```
- Dashboard 로그인 시 `chrome.storage.local.set({ session: token })`
- Extension Background에서 storage.onChanged 리스너
- Supabase 클라이언트 토큰 주입
- I2 요구사항 충족
```

**PRD (prd.md) - 관련 요구사항:**
- **FR4**: Chrome Extension은 Dashboard 로그인 상태를 공유한다
- **I2**: Extension과 Dashboard는 동일한 인증 세션을 공유해야 한다

### 보안 고려사항

| 항목 | 처리 방법 |
|------|----------|
| **토큰 저장** | `chrome.storage.local` - Extension 전용 격리 저장소 |
| **토큰 노출** | Manifest V3 - 콘텐츠 스크립트에서 접근 불가 (Background만) |
| **세션 만료** | `expires_at` 확인 후 만료 시 재인증 요청 |
| **Cross-Origin** | Dashboard와 Extension은 다른 origin이므로 chrome.storage 사용 |

### Edge Cases

| 시나리오 | 처리 방법 |
|----------|----------|
| Extension 미설치 | Dashboard에서 `chrome.storage` 없으면 무시 (graceful) |
| 세션 만료 | Popup에서 "재로그인 필요" 표시 + Dashboard 링크 |
| 동시 로그인 | 새 세션이 이전 세션 덮어씀 (단일 세션 정책) |
| Refresh token 만료 | 재로그인 필요 메시지 표시 |
| 네트워크 오류 | 로컬 캐시된 세션 유지, API 호출 실패 시 에러 표시 |

### Chrome Extension 권한

**현재 manifest 권한 (package.json):**
```json
{
  "permissions": ["storage", "activeTab"],
  "host_permissions": [
    "https://www.wanted.co.kr/*",
    "https://www.saramin.co.kr/*"
  ]
}
```

- `storage`: `chrome.storage.local` 사용에 필요
- 추가 권한 불필요

### 테스트 시나리오

1. **로그인 동기화**
   - Dashboard에서 로그인 → Extension Popup 열기 → "로그인됨" 표시 확인

2. **로그아웃 동기화**
   - Dashboard에서 로그아웃 → Extension Popup 열기 → "로그인 필요" 표시 확인

3. **세션 유지**
   - 브라우저 재시작 → Extension Popup 열기 → 기존 세션 유지 확인

4. **대시보드 열기**
   - Extension Popup에서 "대시보드 열기" 클릭 → 새 탭에서 Dashboard 열림

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication-Security]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.5]
- [Source: _bmad-output/planning-artifacts/prd.md#FR4]
- [Chrome Extension Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Supabase Auth - setSession](https://supabase.com/docs/reference/javascript/auth-setsession)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- SessionSync 클라이언트 컴포넌트 생성 - Supabase onAuthStateChange로 세션 변경 감지
- Content Script (dashboard-session.ts) 생성 - localStorage 변경 감지 및 Background로 전달
- Background Service Worker 업데이트 - 세션 관리 및 Supabase 클라이언트 초기화
- Extension용 Supabase 클라이언트 유틸리티 생성 (lib/supabase.ts)
- 세션 타입 정의 (lib/types.ts)
- Popup UI 업데이트 - 로그인 상태 표시 및 대시보드 링크
- isSessionExpired() 함수로 세션 만료 체크
- Extension 빌드 성공, 린트 통과
- 구현 접근법: Web에서 chrome.storage에 직접 접근 불가하므로 Content Script를 통한 브릿지 패턴 사용

### File List

**신규 파일:**
- `apps/web/src/components/features/auth/session-sync.tsx` - 세션 동기화 클라이언트 컴포넌트
- `apps/extension/contents/dashboard-session.ts` - Dashboard 페이지 Content Script
- `apps/extension/lib/supabase.ts` - Extension용 Supabase 클라이언트
- `apps/extension/lib/types.ts` - 세션 관련 타입 정의
- `apps/extension/options.tsx` - Options 페이지 (Plasmo 빌드 요구사항)
- `apps/extension/.env.example` - Extension 환경 변수 예시

**수정 파일:**
- `apps/web/src/app/layout.tsx` - SessionSync 컴포넌트 추가
- `apps/extension/background.ts` - 세션 관리 로직 추가
- `apps/extension/popup.tsx` - 로그인 상태 표시 UI
- `apps/extension/package.json` - Supabase 의존성 및 host_permissions 추가

## Code Review Record

### Review Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Issues Found

| # | 심각도 | 설명 | 조치 |
|---|--------|------|------|
| 1 | CRITICAL | Story Tasks 미체크 | 수정 완료 |
| 2 | CRITICAL | File List 누락 | 수정 완료 |
| 3 | MEDIUM | sender 파라미터 미사용 경고 | _sender로 수정 완료 |
| 4 | MEDIUM | Content Script localhost only | 노트로 문서화 (프로덕션 배포 시 수정 필요) |
| 5 | LOW | StoredSession 타입 중복 | 수용 (Web/Extension 분리 유지) |
| 6 | LOW | options.tsx 문서화 누락 | File List에 추가 완료 |

### Fixes Applied

- background.ts: `sender` → `_sender` (unused parameter)
- Story 파일: Tasks 체크, File List 완성, Dev Agent Record 완성

### Deferred Items

- Task 5.1 주기적 세션 검증 - 선택적 기능, 추후 구현 가능
- Content Script 프로덕션 URL 지원 - 프로덕션 배포 시 manifest에 URL 추가 필요
