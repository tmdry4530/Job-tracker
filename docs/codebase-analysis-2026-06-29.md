# Job-tracker 리팩토링·업그레이드 실행 리포트

> 대상: pnpm 모노레포(`apps/web` Next 14 / `apps/extension` Plasmo MV3 / `packages/shared`)
> 기준일: 2026-06-29 · 근거: 검증 완료된 코드 발견사항(file:line 유지)

---

## ① 요약

핵심 보안 자세(모든 쿼리 `WHERE user_id`, 결제 쿼리 `id+user_id` 이중 격리, 웹훅 금액성 이벤트 Toss 재검증, JD 프롬프트 sanitize+사용자 격리)는 **전반적으로 양호**하다. 그러나 다음 5개는 **즉시** 손대야 한다.

1. **AI 전 기능 다운 위험** — `client.ts:37`의 하드코딩 모델 `claude-sonnet-4-20250514`가 은퇴 시점을 지나 요약/질문 3개 라우트가 404로 죽을 수 있다.
2. **금전 버그** — 구독 결제가 비트랜잭션이라 카드 청구 후 구독 미기록(재구독 시 `user_id` unique 위반)되고 환불·멱등키가 없다.
3. **계정 탈취** — Google/Kakao `allowDangerousEmailAccountLinking=true`.
4. **SSRF** — OCR 라우트가 사용자 임의 URL을 서버에서 그대로 fetch.
5. **빌드 함정** — Plasmo `.env.local` 우선순위로 프로덕션 빌드가 조용히 `localhost`를 가리킨다.

기반 측면에서 가장 큰 약점은 **품질 안전망 부재**다: 테스트 3개 중 2개가 소스를 import하지 않는 가짜 테스트(실커버리지 ≈0), CI 없음, `pnpm -r lint`가 extension(placeholder)·shared(스크립트 없음)를 건너뛰어 **거짓 통과**한다. 이 때문에 의존성 업그레이드의 회귀가 자동 검증되지 않는다.

의존성은 대부분 1~2 메이저 뒤처졌으나 즉시 위험은 없다. 가장 큰 덩어리는 **Next 14→15/16 + React 19 + eslint flat config**가 서로 강결합된 점이며, `next-auth`는 stable 미출시(beta.31이 최신)라 메이저 전환이 불가능하다. 다행히 `applications/page.tsx`·`[id]/page.tsx`는 이미 async `params` 선제 마이그레이션이 되어 있어 Next 15 부담이 줄었다.

**권장 진행 순서:** Quick Wins(보안/금전) → CI+lint 게이트 구축 → 무해 패치 일괄 → 점진 메이저 업그레이드 → 리팩토링/데드코드 정리.

---

## ② 즉시 처리 권장 (Quick Wins — 고임팩트·저노력)

| # | 항목 | 근거 | 조치 |
|---|------|------|------|
| 1 | **Claude 모델 ID 교체** (긴급) | `client.ts:37` | `claude-sonnet-4-6`(또는 요약은 `claude-haiku-4-5`)로 교체하고 `CLAUDE_MODEL` env로 분리. Opus 4.7+/Fable 5로 갈 경우 `temperature`(summarize/route.ts:123, questions/route.ts:145) 제거 필요 |
| 2 | **OAuth dangerous linking 제거** | `auth.config.ts:13-22` | 두 provider에서 옵션 삭제(기본 false). 기존 다중 provider 사용자 영향 있어 마이그레이션 검토(breaking) |
| 3 | **웹훅 fail-closed 전환** | `webhook/route.ts:47-61,86-101`, `env.ts:36` | secret 미설정 시 `false` 반환, `TOSS_WEBHOOK_SECRET`을 prod 필수 env로 승격, `BILLING_KEY.DELETED`는 Toss 빌링키 조회로 재검증 |
| 4 | **PAYMENT.DONE 멱등 처리** | `webhook/route.ts:104-141`, `subscription.ts:141-157` | `payment_key` 선조회 → 이미 처리 시 renew/insert 스킵하고 200 반환 |
| 5 | **Plasmo 빌드 함정 차단** | `.env.local:2`, `.env.production:2`, `.env.example:3` | 빌드 규칙 문서화 + CI는 `.env.local` 미생성 후 env 직접 주입, `.env.example`의 옛 Vercel URL을 Railway URL로 갱신, postbuild manifest URL 검증 |
| 6 | **pnpm 버전 정렬** | `package.json:25-29` | `pnpm@10.x` 고정, `engines.pnpm>=10`, lockfile 재생성 커밋 |
| 7 | **Sentry 샘플링 하향** | `sentry.server.config.ts:7`, `sentry.client.config.ts:7` | 프로덕션 `tracesSampleRate` 0.1~0.2, edge(0.5)와 일관성 점검, 리플레이 비용 검토 |
| 8 | **next-auth beta 핀 고정** | `package.json:42` | 캐럿 제거 → `5.0.0-beta.31` 정확 핀(자동 점프 차단) |
| 9 | **@types/uuid 제거** | `package.json:51,58`, `ocr/route.ts:79` | devDep 삭제 + `crypto.randomUUID()`로 치환해 uuid 의존성 제거 |
| 10 | **깨진 링크 수정** | `auth/error/page.tsx:31`, `login-form.tsx:89` | `/signup`→`/login`, `/terms`는 페이지 추가 또는 링크 제거 |

---

## ③ 의존성 업그레이드 로드맵 (순서·breaking 표기)

> 원칙: 메이저는 격리 PR, peer-동반 메이저는 한 PR에서 함께, 매 단계 CI 게이트 통과 후 진행.

**선행(메이저 아님) — CI/lint 게이트 구축**
- `.github/workflows/ci.yml`: `pnpm install --frozen-lockfile` → `build:shared` → `-r type-check` → `-r test` → `web lint`. main 브랜치 required check 지정.
- extension lint placeholder를 실제 ESLint(flat)로 교체, shared에 lint 스크립트 추가(거짓 통과 해소).

| Phase | 패키지 | 변경 | breaking | 비고 |
|------|--------|------|:--:|------|
| 1 | radix/sentry/postcss/autoprefixer/prettier/toss/@types/pg/plasmo 0.90/@types/chrome/drizzle-kit(minor)/browserslist | patch·minor 일괄 | ✗ | lucide-react 1.x는 **별도 PR**(아이콘 rename) |
| 2 | @types/node 20→22, next-auth beta 핀, @auth/drizzle-adapter 1.11.2, @anthropic-ai/sdk 0.71→0.106 | DX 정렬 | ✗ | SDK는 `messages.create` 시그니처 점검 |
| 3 | drizzle-orm 0.38→0.45 **+** drizzle-kit 0.30→0.31 | 동반 | ✓ | generate diff·스테이징 migrate 회귀 검증(Railway 직후 민감) |
| 4 | vitest 2→3→4 **+** @vitest/coverage-v8, jsdom 24→29 | 동반 | ✓ | 2→4 직접점프 금지(3 경유). **가짜 테스트 재작성 후** 진행 |
| 5 | zod 3→4 (shared↔web 동반) | 동반 | ✓ | shared 먼저 빌드, `z.string().uuid()`→`z.uuid()` |
| 6 | eslint 8→9 flat config | + no-console | ✓ | eslint-config-next는 Next와 버전 동반 → Phase 7과 묶임 |
| 7 | **Next 14→15 + React 18→19 + eslint-config-next 15** | codemod | ✓ | `auth/error/page.tsx:13` 동기 searchParams를 Promise+await로 수정(유일 차단 요소). Next는 단독 PR 격리. extension은 Plasmo 0.90 React19 호환 확인 전까지 18 유지 가능 |
| 8 | Next 15→16 | | ✓ | fetch 기본 캐시 no-store 영향 점검 |
| 9 (선택) | tailwind 3→4, typescript 5.9→6.0 | 고비용·후순위 | ✓ | 단기엔 tailwind-merge 2→3만 분리. TS6은 메이저 종료 후 단독 |

> **불가:** next-auth v5 stable 미출시(latest=4.24.14, beta=5.0.0-beta.31). 메이저 전환 보류, beta 핀 고정만.

---

## ④ 리팩토링 / 아키텍처

**API 라우트 표준화 (중복·일관성)**
- `withApiHandler({auth, schema, rateLimit})(handler)` 고차 래퍼 도입 — 인증→401, zod safeParse→400, rate-limit→429, try/catch→500 블록이 6개+ 라우트에 복붙됨(`summarize:23-53`, `questions:57-87`, `ocr:124-154`, `get-user.ts:32-44`).
- 표준 `ApiResponse`(ok/fail) + 안전한 `parseJson` 유틸 — payment·sync·jd는 `{error:string}` 제각각, sync·jd는 top-level try/catch가 없어 `request.json()` 비-JSON 시 미처리 500 노출(`sync:30-94`, `jd:22-60`).
- `applications/jd`: 갱신 대상을 `source_url`/`applicationId`로 특정, 매칭 0건은 404(`jd/route.ts:42-57`).

**환경변수 일원화**
- `db/index.ts:13`·`extension-token.ts:15-21`이 `process.env`를 직접 읽어 `env.ts` lazy 검증을 우회 → 필수 env 누락이 부팅이 아닌 첫 쿼리/토큰 발급 때 늦게 드러남. zod 단일 env 모듈 + `instrumentation.ts` 부팅 강제 검증으로 통일. CLOVA OCR/Claude도 `envHelpers`에 통합(`env.ts:8-37`, `ocr/route.ts:60-61`, `claude/client.ts:7`).
- DB SSL 판별(`needsSsl`)이 `db/index.ts:16-20`·`migrate.ts:22-26`에 중복 → shared 유틸로 추출.

**프론트엔드**
- 클라이언트 데이터 패칭 공용 추상화(SWR/React Query 또는 `useResource`) — `jd-summary`/`interview-questions`/`payment-history`가 fetch+useEffect를 손으로 반복. 최소한 jd-summary 자동 POST에 AbortController/가드 추가(중복 POST 차단, `jd-summary.tsx:78`).
- URL searchParam 변경 로직 4중 복제 → `useSetSearchParam(key)` 훅으로(`search-input.tsx:18` 외 3).
- `useSearchParams` Suspense 경계 추가 — payment/success·fail·login(`success/page.tsx:10` 외).
- error.tsx/applications/error.tsx에 `Sentry.captureException` 추가, 미사용 `ErrorBoundary` 통합 또는 삭제.

**익스텐션**
- 토큰 만료(401) 처리 부재 — `apiFetch` 래퍼에서 401/403 감지 → storage auth 정리(팝업 '로그인 필요' 전환) + `SyncResult`에 `auth_expired` 코드, 가능하면 silent refresh(`api-client.ts:45`, `sync-service.ts:160`, `popup.tsx:171`).
- 콘텐츠 스크립트 셀렉터를 constants/shared로 중앙화하고 추출 실패율을 텔레메트리로 보고(해시 의존 셀렉터, `wanted.ts:37` 외). `__NEXT_DATA__` 등 구조화 소스 1순위.
- 헬퍼 중복(showNotification/extractText/dedup/마감일 정규식) 공용 유틸로 통합, saramin 두 파서 단일화.
- `@job-tracker/shared`를 실제 import해 Platform/Status 타입 중복 제거(현재 0회 사용, `extension/lib/types.ts:6`).

**모노레포 툴링**
- Turborepo 도입 — `build`의 `dependsOn: ^build`로 shared→web 순서를 도구화(현재 Dockerfile 수동 규약, `Dockerfile:24`).
- 루트 `tsconfig.json`을 `tsconfig.base.json` extends로 축소, extension 테스트 type-check 포함, shared test 스크립트 추가, `.prettierrc` + `prettier --check` CI.

---

## ⑤ 보안

| 심각도 | 항목 | 근거 |
|:--:|------|------|
| High | 구독 결제 비트랜잭션·재구독 가드 부재(금전 버그) | `subscribe/route.ts:53-120`, `schema.ts:229-232` |
| High | OAuth `allowDangerousEmailAccountLinking` 계정 탈취 | `auth.config.ts:13-22` |
| High | OCR SSRF(임의 URL fetch, allowlist/사설IP차단/타임아웃/max 없음) | `ocr/route.ts:7-9,27-54,160-170` |
| Med | 웹훅 fail-open + BILLING_KEY.DELETED 재검증 누락 | `webhook/route.ts:47-61,86-101`, `env.ts:36` |
| Med | PAYMENT.DONE 비멱등 — 재전송 시 구독기간 중복 연장 | `webhook/route.ts:104-141` |
| Med | 익스텐션 Bearer 토큰 30일 TTL + 폐기/회전 부재 | `extension-token.ts:13,34-47` |
| Med | In-memory rate limiter(다중 인스턴스 무력화) + batch/sync 미보호 | `rate-limit.ts:14`, `summarize/batch/route.ts:24-54` |
| Med | host_permissions 과대 와일드카드 `*.up.railway.app/*` + prod localhost | `extension/package.json:41`, `dashboard-session.ts:11` |
| Low | LLM 출력 렌더링 XSS 확인 필요(dangerouslySetInnerHTML 여부) | `claude/prompts.ts:1-7`, `questions/route.ts:27-52` |

**조치 요지:** 결제는 `db.transaction`으로 charge~기록을 묶고 실패 시 `cancelPayment` 보상 + `onConflictDoUpdate` upsert + orderId 멱등키. OCR은 호스트 allowlist + DNS resolve 후 사설/링크로컬 차단 + AbortController 타임아웃 + 바이트 상한 + `redirect:'manual'` + `imageUrls.max()`. rate limiter는 `@upstash/ratelimit`(Redis)로 교체하고 batch/sync 포함 전 비용 라우트에 적용. 토큰은 TTL 단축(24h) + jti/denylist 또는 `token_version`. host_permissions는 실제 배포 도메인으로 좁히고 dev/prod manifest 분기.

---

## ⑥ 테스트 · CI / 품질

- **CI 부재** — `.github`가 없어 lint/type-check/test 게이트 미자동화. Railway는 Dockerfile 빌드만 수행. → `ci.yml` 추가가 가장 비용 대비 효과 큰 개선.
- **가짜 테스트** — `queries.test.ts:4,24`(SQL 이스케이프 정규식을 본문에 재구현), `parser-utils.test.ts:4`(존재하지 않는 모듈명, 폐기된 상태값 검증). 실제 export를 import하도록 재작성, 폐기 테스트 삭제. 실제 소스 실행 테스트는 `rate-limit.test.ts` 하나뿐.
- **보안 핵심 경로 0 커버** — 우선순위: ① `verifySignature`(유효/위조/secret미설정 분기), ② 웹훅 이벤트별 Toss `getPayment` 모킹 후 위조 페이로드 거부, ③ `getUserIdFromRequest`(Bearer→쿠키 폴백→null), ④ `verifyExtensionToken`(만료/위조). 이 4개로 보안 표면 대부분 커버(`webhook/route.ts:45,100`, `get-user.ts:33`).
- **lint 거짓 통과** — extension placeholder echo, shared lint 스크립트 없음, web eslintrc에 no-console 없음. 루트 공유 flat config + 각 패키지 상속 + `no-console`(log 금지, warn/error 허용).
- **로깅 정책** — 프로덕션 console.* 다수(web `ocr:67`, `webhook:211`, `batch:74-124` PII 포함 / extension 133건, 게이팅 로거 `logger.ts`는 import 0건 데드코드). 환경 게이트 로거 또는 Sentry로 일원화, `next.config` `compiler.removeConsole`(error 제외) 활성화.

---

## ⑦ 영역별 상세 표

| 제목 | 범주 | 심각도 | 노력 | 근거파일 | 권고 |
|------|------|:--:|:--:|------|------|
| Claude 모델 ID 은퇴 → AI 전 기능 404 위험 | upgrade | High | S | `apps/web/src/lib/claude/client.ts:37` | `claude-sonnet-4-6`/`haiku-4-5`로 교체 + `CLAUDE_MODEL` env화 |
| 구독 결제 비트랜잭션·재구독 가드 부재(금전) | security | High | M | `subscribe/route.ts:53-120`, `schema.ts:229-232` | transaction+upsert+환불 보상+orderId 멱등키 |
| OAuth dangerous email linking | security | High | S | `auth.config.ts:13-22` | 옵션 제거(기본 false), 명시적 link 플로우 |
| OCR 라우트 SSRF | security | High | M | `ocr/route.ts:7-9,27-54` | allowlist+사설IP차단+타임아웃+max+manual redirect |
| Plasmo .env.local 프로덕션 빌드 함정 | dx | High | S | `extension/.env.local:2`, `.env.production:2` | 빌드규칙 문서화+CI env 주입+example URL 갱신 |
| 결제/인증 보안경로 테스트 전무 | testing | High | L | `webhook/route.ts:45,100`, `get-user.ts:33` | verifySignature/웹훅/getUserId/extensionToken 단위테스트 |
| Next 14→15/16 (auth/error 차단) | upgrade | Med | L | `package.json:41`, `auth/error/page.tsx:9-15` | codemod 후 동기 searchParams 수정, 단독 PR 격리 |
| React 18→19 (Next 강결합) | upgrade | Med | L | `package.json:45-46`, `extension/package.json:25-26` | Next 15 PR과 동반, types-react-codemod |
| eslint 8→9 flat + extension lint placeholder | dx | Med | M | `.eslintrc.json`, `extension/package.json:16` | flat config 전환, eslint-config-next 동반, 실제 lint 추가 |
| @types/node·TS·CI 정렬 공백 | dx | Med | M | `package.json:20-21`, `.github` | @types/node 22, TS6 보류, CI 추가 |
| 웹훅 fail-open + BILLING_KEY.DELETED | security | Med | S | `webhook/route.ts:47-61,86-101` | fail-closed + 빌링키 재검증, secret 필수화 |
| PAYMENT.DONE 비멱등 | security | Med | S | `webhook/route.ts:104-141` | payment_key 선조회 멱등 처리 |
| 익스텐션 토큰 30일 TTL·회전 부재 | security | Med | M | `extension-token.ts:13,34-47` | TTL 단축+jti/denylist+refresh |
| In-memory rate limiter + 미보호 라우트 | security | Med | M | `rate-limit.ts:14`, `batch/route.ts:24-54` | Redis 교체+전 비용 라우트 적용 |
| host_permissions 과대 와일드카드 | security | Med | S | `extension/package.json:41`, `dashboard-session.ts:11` | 실제 도메인으로 축소, env별 manifest |
| applications/jd 다중행 덮어쓰기+200 | refactor | Med | S | `jd/route.ts:42-57` | source_url/id로 특정, 0건 404 |
| 응답포맷 불일치+sync/jd try/catch 부재 | standards | Med | M | `sync/route.ts:30-94`, `jd/route.ts:22-60` | ApiResponse+parseJson 유틸 통일 |
| 라우트 보일러플레이트 중복 | duplication | Med | M | `summarize:23-53`, `get-user.ts:32-44` | withApiHandler 고차 래퍼 |
| env 검증 우회+lazy | architecture | Med | S | `env.ts:41-89`, `db/index.ts:13` | zod 단일 env, 부팅 강제 검증 |
| 외부호출 타임아웃·재시도 부재 | performance | Med | S | `toss/client.ts:31-38`, `ocr/route.ts:29` | AbortController 타임아웃+백오프 |
| Sentry 샘플링 100% | performance | Med | S | `sentry.server.config.ts:7` | 0.1~0.2로 하향, tracesSampler |
| 결제/구독 UI 클러스터 데드코드 | deadcode | Med | M | `payment/*`, `plan/upgrade-card.tsx:15` | /settings·/pricing 연결 또는 삭제 |
| 상태/중복 필터 3종+action 미사용 | deadcode | Med | S | `status-filter.tsx:13`, `actions.ts:22` | 삭제 또는 ApplicationFilters 연결 |
| URL searchParam 로직 4중 복제 | duplication | Med | S | `search-input.tsx:18` 외 3 | useSetSearchParam 훅 |
| useSearchParams Suspense 부재 | architecture | Med | S | `success/page.tsx:10`, `login-form.tsx:16` | Suspense 래핑 또는 force-dynamic |
| 클라 패칭 추상화 부재+jd 중복POST | architecture | Med | M | `jd-summary.tsx:78`, `interview-questions.tsx:52` | SWR/훅 도입+AbortController |
| error.tsx Sentry 미보고 | architecture | Med | S | `error.tsx:13`, `applications/error.tsx:15` | captureException 추가 |
| 익스텐션 토큰 만료 처리 부재 | architecture | Med | M | `api-client.ts:45`, `popup.tsx:171` | 401 감지→auth 정리+silent refresh |
| 콘텐츠 셀렉터 해시 의존 무경고 빈값 | architecture | Med | L | `wanted.ts:37`, `jd-fetcher.ts:432` | 셀렉터 중앙화+실패 텔레메트리+구조화소스 |
| 콘텐츠 헬퍼 중복 | duplication | Med | M | `wanted-apply-detector.ts:149`, `dom-utils.ts:49` | overlay/dom-utils로 통합 |
| shared 0회 사용+타입 중복정의 | duplication | Med | M | `extension/lib/types.ts:6`, `platform.ts:6` | shared import 또는 의존성 제거 |
| 익스텐션 미사용 모듈 다수 | deadcode | Med | S | `logger.ts:1`, `env.ts:1`, `errors.ts:1` | 삭제+URL 접근 extensionEnv 일원화 |
| wanted-api-interceptor 수신자 없는 데드코드 | deadcode | Med | M | `wanted-api-interceptor.ts:34,160` | 완성 또는 파일+매칭 제거 |
| 익스텐션 console 133개 | standards | Med | M | `background.ts:43`, `saramin.ts:106` | logger 도입+no-console lint |
| 가짜 테스트(소스 미import) | testing | Med | S | `queries.test.ts:4,24`, `parser-utils.test.ts:4` | 실제 export import로 재작성 |
| CI 부재 | dx | Med | S | `.github`, `package.json:14` | ci.yml(install→build:shared→type-check→test→lint) |
| lint 거짓통과 | standards | Med | S | `extension/package.json:16`, `web/.eslintrc.json:2` | 공유 flat config 상속+no-console |
| 익스텐션 logger 데드코드+웹 로거부재 | deadcode | Med | M | `logger.ts:25`, `next.config.js:4` | logger 통일+removeConsole 활성화 |
| turbo 미도입 | architecture | Med | M | `package.json:9`, `Dockerfile:24` | Turborepo build dependsOn ^build |
| rate limiter in-memory(품질관점) | architecture | Med | M | `rate-limit.ts:14,5` | Redis 또는 단일 인스턴스 제약 문서화 |
| zod 3→4 (shared↔web 동반) | upgrade | Low | M | `shared/package.json:23`, `web/package.json:52` | 동반 PR, z.uuid() 정리 |
| vitest 2→3/4+coverage 동반 | upgrade | Low | M | `package.json:60,69`, `extension:34,38` | 동일 메이저, 3 경유 |
| drizzle-orm 0.45+kit 0.31 | upgrade | Low | M | `package.json:38,62` | 동반+스냅샷 회귀 검증 |
| @anthropic-ai/sdk 0.71→0.106 | upgrade | Low | S | `claude/client.ts:1-18,40` | 시그니처 점검+모델 env화 |
| next-auth beta 핀 고정 | upgrade | Med | S | `package.json:42`, `auth.ts:14` | 5.0.0-beta.31 정확 핀 |
| packageManager pnpm 정렬 | dx | Med | S | `package.json:25-29` | pnpm@10 고정+lockfile 재생성 |
| @types/uuid 제거 | dx | Low | S | `package.json:51,58`, `ocr/route.ts:79` | crypto.randomUUID() 치환 |
| Plasmo 0.89→0.90+@types/chrome | upgrade | Low | S | `extension/package.json:24,29` | 0.90 상향+타입 갱신 |
| 무해 패치 일괄 | upgrade | Low | S | `web/package.json:25-33` 외 | radix/sentry/postcss 등 일괄, lucide 분리 |
| tailwind 3→4 | upgrade | Low | L | `tailwind.config.js`, `package.json:66` | 보류, 추후 @tailwindcss/upgrade |
| 쿼리/웹훅 as 캐스팅 타입 드리프트 | standards | Low | M | `subscription.ts:34`, `webhook/route.ts:78` | $inferSelect 파생, payload zod 파싱 |
| sync 에러 마스킹+트리거 per-insert COUNT | performance | Low | S | `sync/route.ts:58-91`, `triggers.sql:57-89` | 한도예외 식별+배치 선검증 |
| DB SSL 중복+history limit 미검증 | duplication | Low | S | `db/index.ts:16-20`, `history/route.ts:21` | needsSsl 추출+limit 클램프 |
| 프로덕션 console.log(PII) | standards | Low | S | `batch/route.ts:74-124`, `ocr/route.ts:67-75` | 구조화 로거+PII 제거 |
| 순수 컴포넌트 불필요 'use client' | performance | Low | S | `platform-badge.tsx:1` 외 3 | 'use client' 제거 |
| jd-summary 무효 Tailwind 블록+취약 휴리스틱 | deadcode | Low | S | `jd-summary.tsx:306,330` | className 제거+구조화 tech_stack 필드 |
| FiltersSkeleton 중복+이중 Suspense | duplication | Low | S | `applications/page.tsx:19,75` | 단일 정의+바깥 Suspense 제거 |
| PlanUsageDisplay 인라인 재구현 | duplication | Low | S | `applications/page.tsx:54`, `plan-usage.tsx:13` | 컴포넌트 사용 또는 삭제 |
| 깨진 링크 /terms·/signup | standards | Low | S | `login-form.tsx:89`, `auth/error/page.tsx:31` | /login 교정, /terms 추가 |
| BookmarkButton 동일 삼항식 | deadcode | Low | S | `bookmark-button.tsx:58` | 상태별 라벨 구분 |
| 미사용 ErrorBoundary | deadcode | Low | S | `error-boundary.tsx:12` | 삭제 또는 통합 |
| SearchInput 고정폭 충돌 | standards | Low | S | `search-input.tsx:38` | w-[300px]→w-full |
| plasmo.ts 플레이스홀더 무의미 주입 | deadcode | Low | S | `contents/plasmo.ts:3` | 삭제 |
| JD 수집 순차+고정 sleep+cross-origin iframe | performance | Low | M | `jd-fetcher.ts:118,190`, `sync-service.ts:108` | 동시성 제한 병렬화+조기종료+서버 페치 |
| LLM 출력 렌더링 XSS 확인 | security | Low | S | `prompts.ts:1-7`, `questions/route.ts:27-52` | HTML 비활성 렌더러+structured outputs |
| 외부 env 검증 불완전(CLOVA/Claude) | dx | Low | S | `env.ts:8-37`, `ocr/route.ts:60-61` | envHelpers 통합+isConfigured 503 |
| TS/포맷 설정 일관성 | standards | Low | S | `tsconfig.json`, `extension/tsconfig.json:31` | base extends+prettier 설정+test 포함 |

---

### 부록 — 진행 원칙
- 메이저 업그레이드는 **CI 게이트 구축 이후** 착수해 각 PR의 회귀를 자동 검증한다.
- 보안 Quick Wins(②의 1~5)는 의존성 작업과 무관하게 **선행**한다(특히 모델 ID·결제·OAuth).
- 데드코드 정리는 "기능 살릴지 결정"이 선행 — 결제 UI 클러스터는 `/settings`·`/pricing` 연결 여부 결정 후 삭제/연결.