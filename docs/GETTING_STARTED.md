# 🚀 Getting Started

BMAD + Claude Code로 프로젝트를 시작하는 가이드

## Prerequisites

- Node.js 20+
- pnpm 8+
- Claude Code CLI (`claude` 명령어)
- Git

## Setup Steps

### 1. 프로젝트 초기화

```bash
# 보일러플레이트 복사 후
cd job-application-tracker

# Git 초기화
git init
git add .
git commit -m "Initial commit: BMAD + Claude Code boilerplate"

# 의존성 설치 (나중에 실제 패키지 추가 후)
pnpm install
```

### 2. BMAD Method 설치 (선택)

Web UI에서 기획/설계를 진행하려면:

```bash
npx bmad-method@alpha install
```

또는 Claude Code 내에서 직접 PM/Architect 역할 수행 가능

### 3. Claude Code 시작

```bash
# 프로젝트 디렉토리에서
claude

# 세션 시작 시 자동으로:
# - sprint-status.yaml 로드
# - Git 상태 확인
# - 프로젝트 컨텍스트 인식
```

## Workflow

### Phase 1-3: 기획 & 설계 (선택적으로 Web UI 사용)

```bash
# Claude Code에서
> Use the pm-agent to create a PRD for this project

# 또는
> Use the architect-agent to design the system architecture
```

### Phase 4: 구현

```bash
# 스프린트 시작
> Let's start Sprint 1. First, create Story 1.1 for Plasmo boilerplate setup

# 스토리 구현
> Use the dev-agent to implement Story 1.1

# 코드 리뷰
> Use the qa-agent to review the implementation
```

## Key Commands in Claude Code

### Subagent 호출

```bash
> Use the pm-agent to ...
> Use the architect-agent to ...
> Use the dev-agent to ...
> Use the qa-agent to ...
```

### 상태 확인

```bash
> Show current sprint status
> What's the next story to work on?
> Summarize today's progress
```

### Story 작업

```bash
> Create story 1.2 for Wanted parser implementation
> Start working on story 1.2
> Mark story 1.2 as complete
```

## File Locations

| Purpose | Location |
|---------|----------|
| Project context | `CLAUDE.md` |
| Hooks config | `.claude/settings.json` |
| Subagents | `.claude/agents/*.md` |
| Sprint status | `docs/sprint-status.yaml` |
| PRD | `docs/prd.md` |
| Architecture | `docs/architecture.md` |
| Stories | `docs/stories/story-*.md` |
| Epics | `docs/epics/epic-*.md` |

## Tips

1. **매 세션 시작 시** sprint-status.yaml 확인됨
2. **Story 작업 전** 반드시 story 파일 읽기
3. **구현 완료 후** story 체크리스트 업데이트
4. **커밋 전** lint + type-check 실행
5. **막히면** `> What should I do next?` 질문

## Troubleshooting

### Hooks가 작동 안 할 때

```bash
# hooks 설정 확인
cat .claude/settings.json

# Claude Code 재시작
exit
claude
```

### Subagent를 찾지 못할 때

```bash
# agents 폴더 확인
ls -la .claude/agents/

# 명시적으로 에이전트 파일 지정
> Read .claude/agents/dev-agent.md and follow its instructions
```

## Next Steps

1. [ ] PRD 작성 (PM Agent)
2. [ ] 아키텍처 설계 (Architect Agent)  
3. [ ] Epic/Story 분해
4. [ ] Sprint 1 시작
5. [ ] Story 1.1 구현

Ready? Let's build! 🎯
