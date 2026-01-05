# Job Application Tracker

채용 플랫폼(원티드, 사람인) 지원 현황을 한 곳에서 통합 관리하는 서비스

## Features

- **자동 수집**: Chrome Extension으로 원티드/사람인 지원 내역 자동 파싱
- **AI JD 요약**: Claude API로 공고 핵심 내용 요약
- **면접 예상 질문**: JD 기반 맞춤형 면접 질문 자동 생성
- **통합 대시보드**: 모든 지원 현황을 한 눈에 관리

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

### Installation

```bash
# 의존성 설치
pnpm install

# 환경변수 설정
cp apps/web/.env.example apps/web/.env.local
cp apps/extension/.env.example apps/extension/.env.local

# 개발 서버 실행
pnpm dev
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
```

## Deployment

- **Web**: Vercel
- **Extension**: Chrome Web Store

## License

MIT
