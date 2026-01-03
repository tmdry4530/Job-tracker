# Web Dashboard

Next.js 14 기반 대시보드 앱

## Setup

```bash
# 프로젝트 루트에서
pnpm install
pnpm dev:web
```

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Database

## Structure

```
web/
├── src/
│   ├── app/           # App Router pages
│   ├── components/    # React components
│   ├── lib/           # Utilities
│   └── types/         # TypeScript types
├── public/
└── package.json
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

> 이 앱은 BMAD Phase 4에서 Epic 3으로 구현됩니다.
