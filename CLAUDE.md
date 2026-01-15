# Job Bookmark Tracker

채용 플랫폼 북마크/스크랩 공고 통합 관리 서비스

## Project Overview

- **목표**: 여러 채용 플랫폼(원티드, 사람인 등)에서 북마크한 공고를 한 곳에서 관리
- **핵심 기능**: 크롬 익스텐션으로 북마크 수집 → LLM으로 JD 요약 → 대시보드에서 관리

## Tech Stack

- **Extension**: Plasmo (TypeScript, React)
- **Frontend**: Next.js 14 (App Router, TypeScript)
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: Claude API (JD 요약)
- **Styling**: Tailwind CSS

## Project Structure

```
/
├── apps/
│   ├── extension/          # Plasmo 크롬 익스텐션
│   └── web/                # Next.js 대시보드
├── packages/
│   └── shared/             # 공유 타입, 유틸
├── docs/
│   ├── prd.md              # Product Requirements Document
│   ├── architecture.md     # System Architecture
│   ├── epics/              # Epic별 상세 문서
│   └── stories/            # Story 파일들
└── .claude/
    ├── agents/             # Subagent 정의
    └── settings.json       # Hooks 설정
```

## Development Commands

```bash
# 전체 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev              # 웹 + 익스텐션 동시
pnpm dev:web          # 웹만
pnpm dev:extension    # 익스텐션만

# 빌드
pnpm build

# 테스트
pnpm test

# 린트
pnpm lint
```

## Code Standards

- TypeScript strict mode 필수
- 컴포넌트는 함수형 + hooks 사용
- API 응답은 zod로 검증
- 커밋 전 lint + type-check 통과 필수
- 테스트 커버리지 80% 이상 목표

## 개발 규칙

1. 코드 수정 전 관련 파일 먼저 읽고 이해
2. 테스트 통과 확인 후 커밋
3. 타입 안전성 유지 (shared 패키지의 타입 활용)

## 금지 사항

- `any` 타입 사용 금지 (불가피한 경우 주석으로 사유 명시)
- console.log 프로덕션 코드에 남기지 않기
- 하드코딩된 API 키나 시크릿 금지
- node_modules, .env 파일 커밋 금지
