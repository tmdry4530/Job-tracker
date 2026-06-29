# Job Tracker 웹앱 (Next.js) — pnpm 모노레포 Dockerfile (Railway 배포용)
# 빌드 컨텍스트는 저장소 루트. shared 패키지 + web 앱만 빌드한다.

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
WORKDIR /app

# ---- deps: 워크스페이스 매니페스트만 먼저 복사해 캐시 활용 ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
COPY apps/extension/package.json apps/extension/
# web + shared 의존성만 설치 (extension 제외)
RUN pnpm install --frozen-lockfile --filter web... --filter @job-tracker/shared...

# ---- build: 소스 복사 후 shared → web 순서로 빌드 ----
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @job-tracker/shared build \
 && pnpm --filter web build

# ---- runtime ----
FROM build AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
# 시작 시 DB 마이그레이션 적용 후 Next.js 기동
CMD ["sh", "-c", "node apps/web/scripts/migrate.mjs && pnpm --filter web start"]
