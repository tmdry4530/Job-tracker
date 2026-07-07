# Job Application Tracker

Chrome Webstore : https://chromewebstore.google.com/detail/mcplgkcchgkjfhedkifomejdedggbobl?utm_source=item-share-cb

채용 플랫폼(원티드, 사람인, 잡코리아) 북마크/스크랩 공고를 한 곳에서 통합 관리하는 서비스

## Features

- **자동 수집**: Chrome Extension으로 북마크/스크랩 공고 자동 파싱
- **JD 자동 수집**: 상세 페이지에서 JD 내용 및 마감일 자동 추출
- **AI JD 요약**: Claude API로 공고 핵심 내용 요약
- **면접 예상 질문**: JD 기반 맞춤형 면접 질문 + 모범 답변 가이드 생성
- **통합 대시보드**: 모든 북마크 현황을 한 눈에 관리
- **마감일 추적**: D-day 배지로 마감일 한눈에 파악

## Supported Platforms

| 플랫폼 | 상태 | 수집 페이지 |
|--------|------|-------------|
| 원티드 (Wanted) | ✅ 지원 | 북마크 페이지 |
| 사람인 | ✅ 지원 | 스크랩 페이지 |
| 잡코리아 | ✅ 지원 | 스크랩 페이지 |
| 점핏 (Jumpit) | 🔜 예정 | - |
| 로켓펀치 | 🔜 예정 | - |

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Extension** | Plasmo, TypeScript, React |
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| **Backend** | Next.js API Routes |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **AI** | Claude API, CLOVA OCR |

## Project Structure

```
├── apps/
│   ├── extension/     # Chrome Extension (Plasmo)
│   └── web/           # Next.js Dashboard
├── packages/
│   └── shared/        # 공유 타입, 유틸
└── supabase/          # DB 마이그레이션
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8.15+
- Supabase 프로젝트
- Claude API Key
- (선택) CLOVA OCR API Key (이미지 기반 JD 추출용)

### Installation

```bash
# 의존성 설치
pnpm install

# 환경변수 설정
cp apps/web/.env.example apps/web/.env.local
cp apps/extension/.env.example apps/extension/.env.local

# Supabase 마이그레이션 적용
supabase db push

# 개발 서버 실행
pnpm dev
```

### Extension Setup

```bash
# 개발용 빌드
pnpm dev:extension

# 프로덕션 빌드
cd apps/extension && pnpm build:prod

# Chrome에서 로드
# 1. chrome://extensions 접속
# 2. "개발자 모드" 활성화
# 3. "압축해제된 확장 프로그램을 로드합니다" 클릭
# 4. apps/extension/build/chrome-mv3-prod 폴더 선택
```

### Environment Variables

**apps/web/.env.local**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
CLOVA_OCR_URL=
CLOVA_OCR_SECRET=
```

**apps/extension/.env.local**
```
PLASMO_PUBLIC_SUPABASE_URL=
PLASMO_PUBLIC_SUPABASE_ANON_KEY=
PLASMO_PUBLIC_DASHBOARD_URL=
```

## Scripts

```bash
pnpm dev              # 전체 개발 서버
pnpm dev:web          # Web만
pnpm dev:extension    # Extension만
pnpm build            # 전체 빌드
pnpm lint             # 린트
pnpm type-check       # 타입 체크
```

## Usage

### Extension 사용법

1. 대시보드에서 로그인
2. 원티드/사람인/잡코리아 스크랩 페이지 방문
3. 자동으로 북마크 수집됨
4. Extension 팝업에서 "지금 동기화" 클릭
5. 대시보드에서 확인 및 AI 요약/질문 생성

### 주요 기능

| 기능 | 설명 |
|------|------|
| 북마크 수집 | 스크랩 페이지 방문 시 자동 수집 |
| 동기화 | 수집된 북마크를 서버에 저장 |
| JD 요약 | AI가 공고 내용을 핵심 포인트로 요약 |
| 면접 질문 | JD 기반 예상 질문 + 모범 답변 생성 |
| 마감일 추적 | D-day 배지로 마감 임박 공고 파악 |

## Deployment

- **Web**: Vercel
- **Extension**: Chrome Web Store
- **Database**: Supabase

## Database Migrations

```bash
# 마이그레이션 생성
supabase migration new <name>

# 마이그레이션 적용
supabase db push

# 마이그레이션 상태 확인
supabase migration list
```

## License

MIT
