# Story Template

Story 파일 생성 시 이 템플릿을 복사하여 사용하세요.
파일명: `story-{epic}.{story}-{slug}.md` (예: `story-1.1-plasmo-setup.md`)

---

# Story {EPIC}.{STORY}: {Title}

## Overview

| Field | Value |
|-------|-------|
| Epic | {Epic Name} |
| Status | `TODO` / `IN_PROGRESS` / `REVIEW` / `DONE` |
| Priority | `HIGH` / `MEDIUM` / `LOW` |
| Estimate | {hours or points} |
| Assigned | {date} |

## Description

{상세 설명 - 무엇을 왜 만드는지}

## User Story

> As a {user type},
> I want to {action},
> So that {benefit}.

## Tasks

- [ ] Task 1: {description}
- [ ] Task 2: {description}
- [ ] Task 3: {description}

## Acceptance Criteria

- [ ] **AC1**: {Given/When/Then 또는 명확한 조건}
- [ ] **AC2**: {criteria}
- [ ] **AC3**: {criteria}

## Technical Notes

### Architecture Reference
- {architecture.md에서 관련 섹션 참조}

### Implementation Hints
- {구현 시 참고할 사항}

### Files to Create/Modify
- `path/to/file.ts` - {purpose}

## Dependencies

| Story | Status | Notes |
|-------|--------|-------|
| {Story X.X} | ✅ DONE | {dependency reason} |

## Test Requirements

- [ ] Unit test for {component/function}
- [ ] Integration test for {flow}

## Dev Notes

> Dev Agent가 구현 중 업데이트하는 섹션

```
{구현 중 발견한 사항, 결정 사항, 이슈 등}
```

## Review Notes

> QA Agent가 리뷰 후 업데이트하는 섹션

```
{리뷰 결과, 피드백 등}
```

---

## Status History

| Date | Status | Agent | Notes |
|------|--------|-------|-------|
| {date} | TODO | PM | Story created |
