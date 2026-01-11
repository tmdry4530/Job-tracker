# Story 3.5: Extension Popup UI

Status: done

## Story

As a **사용자**,
I want **Extension 팝업에서 동기화 상태를 확인하고 수동 동기화를 트리거**,
so that **현재 상태를 쉽게 파악하고 필요 시 즉시 동기화할 수 있다**.

## Acceptance Criteria

1. **AC1**: Extension 아이콘 클릭 시 Popup이 열린다
2. **AC2**: 현재 로그인 상태를 표시한다
3. **AC3**: 마지막 동기화 시간을 표시한다
4. **AC4**: "지금 동기화" 버튼을 제공한다
5. **AC5**: Dashboard 바로가기 링크를 제공한다

## Tasks / Subtasks

- [x] Task 1: Popup 기본 UI (AC: #1, #2)
  - [x] 1.1 로그인 상태 표시 - Story 2.5에서 구현
  - [x] 1.2 로그아웃 상태 시 로그인 유도

- [x] Task 2: 동기화 상태 표시 (AC: #3, #4)
  - [x] 2.1 대기 중인 지원 내역 개수 표시 - Story 3.3에서 구현
  - [x] 2.2 동기화 버튼 - Story 3.3에서 구현
  - [x] 2.3 마지막 동기화 시간 표시

- [x] Task 3: Dashboard 연동 (AC: #5)
  - [x] 3.1 "대시보드 열기" 버튼 - Story 2.5에서 구현

- [x] Task 4: 검증
  - [x] 4.1 빌드 성공 확인

## Dev Notes

### 이전 Story에서 구현된 항목

- Story 2.5: 로그인 상태 표시, 대시보드 열기 버튼
- Story 3.3: 동기화 버튼, 대기 중인 지원 내역 표시, 동기화 결과 표시

### 추가 구현

- 마지막 동기화 시간 표시

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- Popup UI는 Story 2.5와 Story 3.3에서 이미 대부분 구현됨
- 로그인 상태 표시, 동기화 버튼, 대기 중인 지원 내역 표시 완료
- 마지막 동기화 시간 표시 추가

### File List

**기존 파일 (이전 Story에서 구현):**
- `apps/extension/popup.tsx` - 메인 Popup UI

**관련 파일:**
- `apps/extension/lib/types.ts` - 타입 정의
- `apps/extension/background.ts` - 메시지 핸들러
