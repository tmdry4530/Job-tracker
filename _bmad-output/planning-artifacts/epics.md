---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - prd.md
  - architecture.md
project_name: 'job-application-tracker'
date: '2026-01-03'
epic_count: 5
story_count: 26
fr_count: 21
status: complete
---

# Job Application Tracker - Epic & Story Breakdown

## Overview

This document provides the complete epic and story breakdown for Job Application Tracker, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**1. 사용자 인증 (User Authentication)**
- FR1: 사용자는 이메일/비밀번호로 회원가입할 수 있다
- FR2: 사용자는 이메일/비밀번호로 로그인할 수 있다
- FR3: 사용자는 로그아웃할 수 있다
- FR4: Chrome Extension은 Dashboard 로그인 상태를 공유한다

**2. 지원 데이터 수집 (Application Data Collection)**
- FR5: Extension은 원티드 "지원현황" 페이지에서 기존 지원 내역을 파싱할 수 있다
- FR6: Extension은 사람인 "지원현황" 페이지에서 기존 지원 내역을 파싱할 수 있다
- FR7: Extension은 파싱한 데이터를 백엔드에 동기화할 수 있다
- FR8: Extension은 새로운 지원 발생 시 자동으로 감지하여 수집할 수 있다

**3. 지원 현황 관리 (Application Management)**
- FR9: 사용자는 모든 지원 공고를 목록으로 볼 수 있다
- FR10: 사용자는 회사명 또는 포지션명으로 지원 공고를 검색할 수 있다
- FR11: 사용자는 플랫폼(원티드/사람인)으로 지원 공고를 필터링할 수 있다
- FR12: 사용자는 지원 상태(지원완료/서류통과/면접진행/합격/불합격)로 필터링할 수 있다
- FR13: 사용자는 지원 공고의 상태를 수동으로 변경할 수 있다
- FR21: 사용자는 지원 공고를 삭제할 수 있다

**4. AI 분석 (AI Analysis)**
- FR14: 시스템은 JD(Job Description)를 핵심 내용으로 요약할 수 있다
- FR15: 시스템은 JD 기반으로 면접 예상 질문을 생성할 수 있다
- FR16: 사용자는 특정 공고의 JD 요약을 조회할 수 있다
- FR17: 사용자는 특정 공고의 면접 예상 질문을 조회할 수 있다

**5. 공고 상세 (Application Details)**
- FR18: 사용자는 지원 공고의 상세 정보(회사명, 포지션, 지원일, 플랫폼 등)를 볼 수 있다
- FR19: 사용자는 원본 JD 전문을 볼 수 있다
- FR20: 사용자는 지원 공고의 원본 URL로 이동할 수 있다

### Non-Functional Requirements

**Performance (성능)**
- P1: 대시보드 페이지 초기 로딩은 2초 이내에 완료되어야 한다
- P2: 검색/필터 결과는 500ms 이내에 반환되어야 한다
- P3: JD 요약 생성은 5초 이내에 완료되어야 한다 (Claude API 포함)
- P4: Extension DOM 파싱은 3초 이내에 완료되어야 한다

**Security (보안)**
- S1: 모든 사용자 데이터는 HTTPS로 전송되어야 한다
- S2: 비밀번호는 해시 처리되어 저장되어야 한다 (Supabase Auth 기본 제공)
- S3: API 엔드포인트는 인증된 사용자만 접근 가능해야 한다
- S4: Claude API 키는 서버 사이드에서만 사용되어야 한다
- S5: 사용자는 본인의 지원 데이터만 조회할 수 있어야 한다 (Row Level Security)

**Reliability (신뢰성)**
- R1: 원티드 파서는 95% 이상의 성공률을 유지해야 한다
- R2: 사람인 파서는 90% 이상의 성공률을 유지해야 한다
- R3: 파싱 실패 시 사용자에게 명확한 에러 메시지를 표시해야 한다
- R4: 서버 다운타임은 월 4시간 이하여야 한다 (99.5% uptime)

**Integration (통합)**
- I1: Extension은 Chrome Manifest V3 규격을 준수해야 한다
- I2: Extension과 Dashboard는 동일한 인증 세션을 공유해야 한다
- I3: Supabase Realtime으로 Extension → Dashboard 데이터 동기화를 지원해야 한다
- I4: Claude API 호출 실패 시 graceful degradation (요약 없이 원본 JD 표시)해야 한다

### Additional Requirements

**Starter Template (Epic 1, Story 1):**
- pnpm workspace 모노레포 구조 초기화
- Plasmo Extension 앱 생성 (with Tailwind CSS)
- Next.js 14 Web 앱 생성 (App Router, TypeScript)
- Shared 패키지 생성 (공유 타입, 유틸)
- Supabase 프로젝트 설정 및 초기 스키마 생성

**Technical Requirements:**
- React 18.2.x 사용 (React 19 금지 - CVE-2025-55182)
- Next.js 14.2.x 사용 (Next.js 15/16 금지)
- TypeScript strict mode 필수
- Supabase RLS 정책 구현 (user_id 기반)
- chrome.storage.local 세션 토큰 공유
- React Query 서버 상태 관리
- Zod 런타임 검증
- shadcn/ui 컴포넌트

**Infrastructure:**
- Vercel 배포 (Next.js Dashboard)
- Chrome Web Store 배포 (Extension)
- GitHub Actions CI/CD
- Supabase Cloud (Database + Auth)

---

## FR Coverage Map

| FR | Epic | Story | 설명 |
|----|------|-------|------|
| FR1 | Epic 2 | 2.1 | 이메일/비밀번호 회원가입 |
| FR2 | Epic 2 | 2.2 | 이메일/비밀번호 로그인 |
| FR3 | Epic 2 | 2.3 | 로그아웃 |
| FR4 | Epic 2 | 2.5 | Extension-Dashboard 세션 공유 |
| FR5 | Epic 3 | 3.1 | 원티드 지원현황 파싱 |
| FR6 | Epic 3 | 3.2 | 사람인 지원현황 파싱 |
| FR7 | Epic 3 | 3.3 | 백엔드 동기화 |
| FR8 | Epic 3 | 3.4 | 새 지원 자동 감지 |
| FR9 | Epic 4 | 4.1 | 지원 목록 조회 |
| FR10 | Epic 4 | 4.2 | 회사명/포지션 검색 |
| FR11 | Epic 4 | 4.3 | 플랫폼 필터링 |
| FR12 | Epic 4 | 4.3 | 상태 필터링 |
| FR13 | Epic 4 | 4.4 | 상태 수동 변경 |
| FR14 | Epic 5 | 5.1 | JD 요약 생성 |
| FR15 | Epic 5 | 5.2 | 면접 예상 질문 생성 |
| FR16 | Epic 5 | 5.3 | JD 요약 조회 |
| FR17 | Epic 5 | 5.4 | 예상 질문 조회 |
| FR18 | Epic 4 | 4.5 | 공고 상세 정보 |
| FR19 | Epic 4 | 4.5 | 원본 JD 조회 |
| FR20 | Epic 4 | 4.5 | 원본 URL 링크 |
| FR21 | Epic 4 | 4.6 | 공고 삭제 |

---

## Epic List

### Epic 1: Project Foundation & Infrastructure
프로젝트 기반 설정 - 모노레포 구조, Supabase 스키마, 기본 앱 구조를 설정하여 모든 후속 Epic의 기반을 마련합니다.
**FRs covered:** (Infrastructure - enables all FRs)
**NFRs addressed:** I1, S1

### Epic 2: User Authentication & Session Sharing
사용자가 이메일/비밀번호로 회원가입, 로그인, 로그아웃하고, Chrome Extension과 Dashboard 간에 인증 상태를 자동으로 공유할 수 있습니다.
**FRs covered:** FR1, FR2, FR3, FR4
**NFRs addressed:** S2, S3, S5, I2

### Epic 3: Job Application Data Collection
Chrome Extension을 통해 원티드와 사람인 플랫폼에서 기존 지원 내역을 파싱하고, 새로운 지원을 자동 감지하며, 데이터를 백엔드에 동기화합니다.
**FRs covered:** FR5, FR6, FR7, FR8
**NFRs addressed:** R1, R2, R3, P4, I3

### Epic 4: Application Dashboard & Management
대시보드에서 지원 공고 목록 조회, 검색, 플랫폼/상태 필터링, 상태 변경, 상세 정보 확인, 삭제 기능을 사용할 수 있습니다.
**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR18, FR19, FR20, FR21
**NFRs addressed:** P1, P2

### Epic 5: AI-Powered JD Analysis
Claude API를 활용하여 JD 핵심 요약을 생성하고, 면접 예상 질문을 자동 생성합니다. 사용자는 각 공고에서 요약과 질문을 조회할 수 있습니다.
**FRs covered:** FR14, FR15, FR16, FR17
**NFRs addressed:** P3, S4, I4

---

## Stories

### Epic 1: Project Foundation & Infrastructure

#### Story 1.1: 모노레포 구조 초기화

**사용자 스토리**: 개발자로서, pnpm workspace 기반 모노레포 구조를 설정하여 Extension과 Web 앱을 효율적으로 관리하고 싶다.

**수용 기준**:
```gherkin
Given 프로젝트 루트 디렉토리가 있을 때
When 모노레포 구조를 초기화하면
Then pnpm-workspace.yaml이 생성된다
And apps/extension, apps/web, packages/shared 디렉토리가 생성된다
And 루트 package.json에 워크스페이스 스크립트가 정의된다
And pnpm install이 모든 워크스페이스에서 성공한다
```

**기술 노트**:
- pnpm ^8.15.0 사용
- TypeScript 프로젝트 레퍼런스 설정
- 루트 tsconfig.json 공통 설정

**의존성**: 없음 (시작점)

---

#### Story 1.2: Next.js 14 Web 앱 설정

**사용자 스토리**: 개발자로서, Next.js 14 App Router 기반 대시보드 앱을 생성하고 싶다.

**수용 기준**:
```gherkin
Given apps/web 디렉토리가 있을 때
When Next.js 앱을 초기화하면
Then Next.js 14.2.x가 설치된다
And App Router 구조(app/)가 설정된다
And TypeScript strict mode가 활성화된다
And Tailwind CSS가 설정된다
And pnpm dev:web으로 개발 서버가 실행된다
```

**기술 노트**:
- Next.js ^14.2.35 (15/16 사용 금지 - CVE-2025-55182)
- React ^18.2.0 (19 사용 금지)
- shadcn/ui 초기 설정 포함
- @/ 경로 alias 설정

**의존성**: Story 1.1

---

#### Story 1.3: Supabase 스키마 및 RLS 설정

**사용자 스토리**: 개발자로서, Supabase에 데이터베이스 스키마와 보안 정책을 설정하고 싶다.

**수용 기준**:
```gherkin
Given Supabase 프로젝트가 생성되었을 때
When 스키마 마이그레이션을 실행하면
Then applications 테이블이 생성된다
And jd_summaries 테이블이 생성된다
And interview_questions 테이블이 생성된다
And 각 테이블에 user_id 기반 RLS 정책이 적용된다
And 사용자는 본인 데이터만 CRUD 가능하다
```

**기술 노트**:
- Supabase CLI로 마이그레이션 관리
- RLS: `auth.uid() = user_id` 정책
- applications 테이블: id, user_id, company_name, position, platform, status, applied_at, source_url, jd_content, created_at, updated_at

**의존성**: Story 1.1

---

#### Story 1.4: Plasmo Extension 앱 설정

**사용자 스토리**: 개발자로서, Plasmo 기반 Chrome Extension 앱을 생성하고 싶다.

**수용 기준**:
```gherkin
Given apps/extension 디렉토리가 있을 때
When Plasmo 앱을 초기화하면
Then Manifest V3 기반 Extension이 생성된다
And TypeScript + React 설정이 완료된다
And Tailwind CSS가 설정된다
And pnpm dev:extension으로 개발 빌드가 실행된다
And Chrome에서 Extension 로드가 가능하다
```

**기술 노트**:
- Plasmo framework (latest)
- PLASMO_PUBLIC_* 환경변수 설정
- Content Scripts 구조 설정
- Background Service Worker 설정

**의존성**: Story 1.1

---

#### Story 1.5: Shared 패키지 설정

**사용자 스토리**: 개발자로서, Extension과 Web 간 공유할 타입과 유틸리티를 관리하고 싶다.

**수용 기준**:
```gherkin
Given packages/shared 디렉토리가 있을 때
When Shared 패키지를 설정하면
Then TypeScript 라이브러리로 빌드 가능하다
And Application, User 등 공유 타입이 정의된다
And Zod 스키마가 정의된다
And apps/web과 apps/extension에서 import 가능하다
```

**기술 노트**:
- tsup 또는 unbuild로 빌드
- workspace:* 프로토콜로 의존성 설정
- 타입 정의: Application, ApplicationStatus, Platform 등

**의존성**: Story 1.1

---

### Epic 2: User Authentication & Session Sharing

#### Story 2.1: 이메일/비밀번호 회원가입 (FR1)

**사용자 스토리**: 사용자로서, 이메일과 비밀번호로 회원가입하여 서비스를 이용하고 싶다.

**수용 기준**:
```gherkin
Given 비로그인 사용자가 회원가입 페이지에 접속했을 때
When 유효한 이메일과 비밀번호(8자 이상)를 입력하고 제출하면
Then Supabase Auth에 계정이 생성된다
And 이메일 확인 메일이 발송된다
And 회원가입 성공 메시지가 표시된다
```

**기술 노트**:
- Route: `apps/web/app/(auth)/signup/page.tsx`
- Supabase `signUp()` 메서드 사용
- Zod로 입력 검증 (이메일 형식, 비밀번호 길이)
- 비밀번호 해시는 Supabase Auth에서 자동 처리 (S2)

**의존성**: Story 1.2, Story 1.3

---

#### Story 2.2: 이메일/비밀번호 로그인 (FR2)

**사용자 스토리**: 사용자로서, 이메일과 비밀번호로 로그인하여 대시보드에 접근하고 싶다.

**수용 기준**:
```gherkin
Given 등록된 사용자가 로그인 페이지에 접속했을 때
When 올바른 이메일과 비밀번호를 입력하고 제출하면
Then Supabase 세션이 생성된다
And 대시보드 페이지로 리다이렉트된다
And 세션 토큰이 쿠키에 저장된다
```

**기술 노트**:
- Route: `apps/web/app/(auth)/login/page.tsx`
- Supabase `signInWithPassword()` 메서드 사용
- 세션 쿠키: `sb-access-token`, `sb-refresh-token`
- 로그인 실패 시 에러 메시지 표시

**의존성**: Story 2.1

---

#### Story 2.3: 로그아웃 (FR3)

**사용자 스토리**: 사용자로서, 로그아웃하여 세션을 종료하고 싶다.

**수용 기준**:
```gherkin
Given 로그인된 사용자가 대시보드에 있을 때
When 로그아웃 버튼을 클릭하면
Then Supabase 세션이 종료된다
And 세션 쿠키가 삭제된다
And 로그인 페이지로 리다이렉트된다
```

**기술 노트**:
- Supabase `signOut()` 메서드 사용
- Extension에도 로그아웃 이벤트 전파 (chrome.storage.local 클리어)
- React Query 캐시 클리어

**의존성**: Story 2.2

---

#### Story 2.4: Dashboard 인증 미들웨어

**사용자 스토리**: 시스템으로서, 비인증 사용자의 대시보드 접근을 차단하고 싶다.

**수용 기준**:
```gherkin
Given 비로그인 사용자가 /dashboard에 접근할 때
When 세션이 없으면
Then /login 페이지로 리다이렉트된다

Given 로그인된 사용자가 /dashboard에 접근할 때
When 유효한 세션이 있으면
Then 대시보드 콘텐츠가 표시된다
```

**기술 노트**:
- Next.js Middleware: `apps/web/middleware.ts`
- Supabase `getSession()` 서버사이드 검증
- Protected routes: `/dashboard/*`
- Public routes: `/login`, `/signup`

**의존성**: Story 2.2

---

#### Story 2.5: Extension-Dashboard 세션 공유 (FR4)

**사용자 스토리**: 사용자로서, Dashboard에서 로그인하면 Extension에서도 자동으로 인증된 상태를 유지하고 싶다.

**수용 기준**:
```gherkin
Given 사용자가 Dashboard에서 로그인했을 때
When Extension이 활성화되면
Then chrome.storage.local에서 세션 토큰을 읽어온다
And Extension에서 인증된 API 호출이 가능하다
And 세션 만료 시 재인증을 요청한다
```

**기술 노트**:
- Dashboard 로그인 시 `chrome.storage.local.set({ session: token })`
- Extension Background에서 storage.onChanged 리스너
- Supabase 클라이언트 토큰 주입
- I2 요구사항 충족

**의존성**: Story 1.4, Story 2.2

---

### Epic 3: Job Application Data Collection

#### Story 3.1: 원티드 지원현황 페이지 파싱 (FR5)

**사용자 스토리**: 사용자로서, 원티드 "지원현황" 페이지에서 기존 지원 내역을 자동으로 수집하고 싶다.

**수용 기준**:
```gherkin
Given 사용자가 원티드 지원현황 페이지(wanted.co.kr/cv/applications)에 있을 때
When Extension이 페이지 로드를 감지하면
Then DOM에서 지원 내역(회사명, 포지션, 지원일, 상태, JD URL)을 파싱한다
And 파싱 결과를 Application 타입으로 변환한다
And 파싱 성공/실패 상태를 사용자에게 표시한다
```

**기술 노트**:
- Content Script: `apps/extension/contents/wanted.ts`
- DOM 셀렉터 기반 파싱 (테이블/리스트 구조)
- 페이지네이션 처리 (무한스크롤 대응)
- 파싱 성공률 95% 목표 (R1)
- 3초 이내 완료 (P4)

**의존성**: Story 1.4

---

#### Story 3.2: 사람인 지원현황 페이지 파싱 (FR6)

**사용자 스토리**: 사용자로서, 사람인 "지원현황" 페이지에서 기존 지원 내역을 자동으로 수집하고 싶다.

**수용 기준**:
```gherkin
Given 사용자가 사람인 지원현황 페이지(saramin.co.kr/zf_user/applyin-status)에 있을 때
When Extension이 페이지 로드를 감지하면
Then DOM에서 지원 내역(회사명, 포지션, 지원일, 상태, JD URL)을 파싱한다
And 파싱 결과를 Application 타입으로 변환한다
And 파싱 성공/실패 상태를 사용자에게 표시한다
```

**기술 노트**:
- Content Script: `apps/extension/contents/saramin.ts`
- 사람인 특유의 DOM 구조 대응
- 파싱 성공률 90% 목표 (R2)
- 3초 이내 완료 (P4)
- 실패 시 명확한 에러 메시지 (R3)

**의존성**: Story 1.4

---

#### Story 3.3: 파싱 데이터 백엔드 동기화 (FR7)

**사용자 스토리**: 사용자로서, Extension에서 파싱한 지원 내역이 백엔드에 자동으로 저장되어 Dashboard에서 볼 수 있기를 원한다.

**수용 기준**:
```gherkin
Given Extension이 지원 내역 파싱을 완료했을 때
When 사용자가 "동기화" 버튼을 클릭하면
Then Supabase에 새로운 지원 내역을 upsert한다
And 중복 데이터는 source_url 기준으로 스킵하거나 업데이트한다
And 동기화 성공/실패 결과를 Extension UI에 표시한다
And Realtime으로 Dashboard에 업데이트를 전파한다 (I3)
```

**기술 노트**:
- Background Service Worker에서 Supabase 호출
- Upsert 로직: `ON CONFLICT (user_id, source_url)`
- Batch insert 처리 (성능 최적화)
- Supabase Realtime 구독 설정

**의존성**: Story 1.3, Story 2.5

---

#### Story 3.4: 새 지원 자동 감지 (FR8)

**사용자 스토리**: 사용자로서, 새로운 공고에 지원했을 때 Extension이 자동으로 감지하여 수집해주기를 원한다.

**수용 기준**:
```gherkin
Given Extension이 원티드/사람인 지원완료 페이지를 감지할 때
When 지원 완료 DOM 요소가 나타나면
Then 해당 지원 정보를 자동으로 파싱한다
And 파싱된 데이터를 즉시 백엔드에 동기화한다
And Extension 뱃지에 새 지원 카운트를 표시한다
```

**기술 노트**:
- MutationObserver로 DOM 변화 감지
- 지원완료 페이지 URL 패턴 매칭
- Background에서 chrome.action.setBadgeText 업데이트
- 자동 감지 on/off 설정 옵션

**의존성**: Story 3.1, Story 3.2, Story 3.3

---

#### Story 3.5: Extension Popup UI

**사용자 스토리**: 사용자로서, Extension 팝업에서 동기화 상태를 확인하고 수동 동기화를 트리거하고 싶다.

**수용 기준**:
```gherkin
Given Extension 아이콘을 클릭했을 때
When Popup이 열리면
Then 현재 로그인 상태를 표시한다
And 마지막 동기화 시간을 표시한다
And "지금 동기화" 버튼을 제공한다
And Dashboard 바로가기 링크를 제공한다
```

**기술 노트**:
- `apps/extension/popup.tsx` (Plasmo popup)
- React + Tailwind CSS UI
- chrome.storage.local에서 상태 읽기
- Background Service Worker와 메시지 통신

**의존성**: Story 1.4, Story 2.5

---

### Epic 4: Application Dashboard & Management

#### Story 4.1: 지원 목록 조회 (FR9)

**사용자 스토리**: 사용자로서, 대시보드에서 모든 지원 공고를 목록으로 보고 싶다.

**수용 기준**:
```gherkin
Given 인증된 사용자가 대시보드에 접속했을 때
When /dashboard 페이지가 로드되면
Then 사용자의 모든 지원 공고가 목록으로 표시된다
And 각 항목에 회사명, 포지션, 플랫폼, 지원일, 상태가 표시된다
And 최신 지원순으로 정렬된다
And 페이지 초기 로딩이 2초 이내에 완료된다 (P1)
```

**기술 노트**:
- Route: `apps/web/app/(dashboard)/dashboard/page.tsx`
- React Query 훅: `useApplications()`
- Server Component에서 초기 데이터 fetch
- 무한 스크롤 또는 페이지네이션

**의존성**: Story 1.2, Story 1.3

---

#### Story 4.2: 검색 기능 (FR10)

**사용자 스토리**: 사용자로서, 회사명 또는 포지션명으로 지원 공고를 검색하고 싶다.

**수용 기준**:
```gherkin
Given 지원 목록 페이지에서
When 검색창에 키워드를 입력하면
Then 회사명 또는 포지션명에 키워드가 포함된 공고만 표시된다
And 검색 결과가 500ms 이내에 반환된다 (P2)
And 검색어가 없으면 전체 목록을 표시한다
```

**기술 노트**:
- Debounced input (300ms)
- Supabase `ilike` 쿼리 또는 Full-text search
- URL 쿼리 파라미터 동기화 (`?q=keyword`)
- React Query `queryKey`에 검색어 포함

**의존성**: Story 4.1

---

#### Story 4.3: 필터링 기능 (FR11, FR12)

**사용자 스토리**: 사용자로서, 플랫폼과 지원 상태로 공고를 필터링하고 싶다.

**수용 기준**:
```gherkin
Given 지원 목록 페이지에서
When 플랫폼 필터(원티드/사람인/전체)를 선택하면
Then 해당 플랫폼의 공고만 표시된다

Given 지원 목록 페이지에서
When 상태 필터(지원완료/서류통과/면접진행/합격/불합격)를 선택하면
Then 해당 상태의 공고만 표시된다

And 필터 결과가 500ms 이내에 반환된다 (P2)
And 복합 필터(플랫폼 + 상태 + 검색)가 가능하다
```

**기술 노트**:
- Filter UI: shadcn/ui Select 또는 DropdownMenu
- URL 쿼리 파라미터: `?platform=wanted&status=applied`
- Supabase `.eq()` 체이닝
- React Query `queryKey`에 필터 포함

**의존성**: Story 4.1

---

#### Story 4.4: 상태 변경 (FR13)

**사용자 스토리**: 사용자로서, 지원 공고의 상태를 수동으로 변경하고 싶다.

**수용 기준**:
```gherkin
Given 지원 목록에서 특정 공고를 선택했을 때
When 상태 드롭다운에서 새 상태를 선택하면
Then 해당 공고의 상태가 업데이트된다
And UI가 즉시 반영된다 (Optimistic Update)
And 변경 성공 토스트가 표시된다
```

**기술 노트**:
- React Query `useMutation` + Optimistic Update
- API: `PATCH /api/applications/[id]`
- Status enum: `applied | document_passed | interview | accepted | rejected`
- RLS: 본인 데이터만 수정 가능 (S5)

**의존성**: Story 4.1

---

#### Story 4.5: 공고 상세 정보 (FR18, FR19, FR20)

**사용자 스토리**: 사용자로서, 지원 공고의 상세 정보와 원본 JD를 확인하고 싶다.

**수용 기준**:
```gherkin
Given 지원 목록에서 특정 공고를 클릭했을 때
When 상세 페이지/모달이 열리면
Then 회사명, 포지션, 지원일, 플랫폼, 상태가 표시된다
And 원본 JD 전문을 볼 수 있다
And "원본 공고 보기" 버튼으로 원본 URL로 이동할 수 있다
```

**기술 노트**:
- Route: `apps/web/app/(dashboard)/applications/[id]/page.tsx`
- 또는 Sheet/Modal 컴포넌트 사용
- JD 텍스트 마크다운 렌더링
- `window.open(sourceUrl, '_blank')`

**의존성**: Story 4.1

---

#### Story 4.6: 공고 삭제 (FR21)

**사용자 스토리**: 사용자로서, 더 이상 필요없는 지원 공고를 삭제하고 싶다.

**수용 기준**:
```gherkin
Given 지원 상세 페이지에서
When "삭제" 버튼을 클릭하면
Then 확인 다이얼로그가 표시된다
And 확인 시 해당 공고가 삭제된다
And 목록 페이지로 리다이렉트된다
And 삭제 성공 토스트가 표시된다
```

**기술 노트**:
- shadcn/ui AlertDialog 사용
- API: `DELETE /api/applications/[id]`
- Soft delete 또는 Hard delete (정책 결정 필요)
- RLS: 본인 데이터만 삭제 가능 (S5)

**의존성**: Story 4.5

---

### Epic 5: AI-Powered JD Analysis

#### Story 5.1: JD 요약 생성 API (FR14)

**사용자 스토리**: 시스템으로서, JD(Job Description)를 핵심 내용으로 요약할 수 있다.

**수용 기준**:
```gherkin
Given JD 텍스트가 주어졌을 때
When JD 요약 API가 호출되면
Then Claude API를 통해 JD 핵심 내용을 요약한다
And 요약 결과를 jd_summaries 테이블에 저장한다
And 요약 생성이 5초 이내에 완료된다 (P3)
And API 호출 실패 시 원본 JD를 반환한다 (I4, Graceful Degradation)
```

**기술 노트**:
- API Route: `apps/web/app/api/ai/summarize/route.ts`
- Claude API: `@anthropic-ai/sdk`
- Prompt Engineering: 핵심 요구사항, 기술스택, 우대사항 추출
- API 키는 서버사이드만 (S4)
- 캐싱: 동일 JD 재요청 시 DB 조회

**의존성**: Story 1.3

---

#### Story 5.2: 면접 예상 질문 생성 API (FR15)

**사용자 스토리**: 시스템으로서, JD 기반으로 면접 예상 질문을 생성할 수 있다.

**수용 기준**:
```gherkin
Given JD 텍스트가 주어졌을 때
When 면접 질문 생성 API가 호출되면
Then Claude API를 통해 5~10개의 면접 예상 질문을 생성한다
And 질문 결과를 interview_questions 테이블에 저장한다
And 질문 생성이 5초 이내에 완료된다 (P3)
And API 호출 실패 시 에러 메시지를 반환한다
```

**기술 노트**:
- API Route: `apps/web/app/api/ai/questions/route.ts`
- Prompt Engineering: 기술 질문, 경험 질문, 상황 질문 분류
- 질문 개수 파라미터 지원 (기본 7개)
- Rate limiting 고려

**의존성**: Story 1.3

---

#### Story 5.3: JD 요약 조회 UI (FR16)

**사용자 스토리**: 사용자로서, 특정 공고의 JD 요약을 조회하고 싶다.

**수용 기준**:
```gherkin
Given 공고 상세 페이지에서
When "AI 요약" 탭/섹션을 클릭하면
Then 저장된 JD 요약이 표시된다
And 요약이 없으면 "요약 생성" 버튼이 표시된다
And 버튼 클릭 시 요약이 생성되고 로딩 상태가 표시된다
And 생성 완료 후 요약이 표시된다
```

**기술 노트**:
- React Query 훅: `useJdSummary(applicationId)`
- Mutation: `useGenerateSummary()`
- 로딩 UI: Skeleton 또는 Spinner
- 에러 시 Retry 버튼 제공

**의존성**: Story 4.5, Story 5.1

---

#### Story 5.4: 면접 예상 질문 조회 UI (FR17)

**사용자 스토리**: 사용자로서, 특정 공고의 면접 예상 질문을 조회하고 싶다.

**수용 기준**:
```gherkin
Given 공고 상세 페이지에서
When "면접 준비" 탭/섹션을 클릭하면
Then 생성된 면접 예상 질문 목록이 표시된다
And 질문이 없으면 "질문 생성" 버튼이 표시된다
And 버튼 클릭 시 질문이 생성되고 로딩 상태가 표시된다
And 각 질문에 카테고리(기술/경험/상황)가 표시된다
```

**기술 노트**:
- React Query 훅: `useInterviewQuestions(applicationId)`
- Mutation: `useGenerateQuestions()`
- Accordion UI로 질문/답변 힌트 제공 가능
- 질문 재생성 옵션

**의존성**: Story 4.5, Story 5.2

---

#### Story 5.5: AI 기능 에러 핸들링

**사용자 스토리**: 사용자로서, AI 기능 오류 시에도 기본 기능을 사용할 수 있어야 한다.

**수용 기준**:
```gherkin
Given Claude API 호출이 실패했을 때
When 요약/질문 생성 요청이 실패하면
Then 사용자에게 친절한 에러 메시지를 표시한다
And 원본 JD는 계속 볼 수 있다 (Graceful Degradation, I4)
And "다시 시도" 버튼을 제공한다
And 에러 로그를 서버에 기록한다
```

**기술 노트**:
- Error Boundary 컴포넌트
- API 에러 코드 정의: `AI_SERVICE_UNAVAILABLE`, `AI_RATE_LIMITED`
- Retry 로직 (최대 3회)
- Fallback UI 컴포넌트

**의존성**: Story 5.3, Story 5.4

---

## Validation Summary

### FR Coverage: 21/21 (100%)

All functional requirements have been mapped to specific stories with clear acceptance criteria.

### Story Count by Epic

| Epic | Stories | FR Coverage |
|------|---------|-------------|
| Epic 1: Project Foundation | 5 | Infrastructure |
| Epic 2: Authentication | 5 | FR1-4 |
| Epic 3: Data Collection | 5 | FR5-8 |
| Epic 4: Dashboard | 6 | FR9-13, FR18-21 |
| Epic 5: AI Analysis | 5 | FR14-17 |
| **Total** | **26** | **21 FRs** |

### Dependency Chain

```
Epic 1 (Foundation) → Epic 2 (Auth) → Epic 3 (Collection)
                  ↘            ↘
                   Epic 4 (Dashboard) → Epic 5 (AI)
```

---

_Generated: 2026-01-03_
_Source: prd.md, architecture.md_
