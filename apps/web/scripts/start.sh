#!/bin/sh
# Railway 시작 스크립트 — 마이그레이션 후 Next.js 기동.
# 커스텀 start command가 셸로 안 감싸질 때 '&&'가 무시되는 문제를 피하려고 단일 스크립트로 묶음.
set -e

echo ">> [start.sh] DB 마이그레이션 실행"
node /app/apps/web/scripts/migrate.mjs

echo ">> [start.sh] Next.js 기동 (0.0.0.0:${PORT:-3000})"
cd /app/apps/web
exec ./node_modules/.bin/next start -H 0.0.0.0
