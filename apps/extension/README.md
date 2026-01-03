# Chrome Extension

Plasmo 기반 크롬 익스텐션

## Setup

```bash
# 프로젝트 루트에서
pnpm install
pnpm dev:extension
```

## Tech Stack

- Plasmo Framework
- TypeScript
- React
- Tailwind CSS

## Structure

```
extension/
├── src/
│   ├── contents/      # Content scripts (DOM 파싱)
│   ├── background/    # Service worker
│   ├── popup/         # Extension popup UI
│   └── lib/           # Utilities
├── assets/
└── package.json
```

## Supported Platforms

- [x] 원티드 (wanted.co.kr)
- [ ] 사람인 (saramin.co.kr)
- [ ] 잡코리아 (jobkorea.co.kr)
- [ ] 링크드인 (linkedin.com)

## Development

```bash
# 개발 모드
pnpm dev:extension

# 빌드
pnpm build:extension
```

빌드 후 `chrome://extensions`에서 `build/chrome-mv3-dev` 폴더를 로드

> 이 앱은 BMAD Phase 4에서 Epic 1으로 구현됩니다.
