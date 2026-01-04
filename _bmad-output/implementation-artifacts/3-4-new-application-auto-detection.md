# Story 3.4: 새 지원 자동 감지

Status: done

## Story

As a **사용자**,
I want **새로운 공고에 지원했을 때 Extension이 자동으로 감지하여 수집**,
so that **지원 후 별도 작업 없이 자동으로 대시보드에 반영된다**.

## Acceptance Criteria

1. **AC1**: 원티드/사람인 지원완료 페이지에서 지원 완료 DOM 요소를 감지한다
2. **AC2**: 감지된 지원 정보를 자동으로 파싱한다
3. **AC3**: 파싱된 데이터를 즉시 백엔드에 동기화한다
4. **AC4**: Extension 뱃지에 새 지원 카운트를 표시한다
5. **AC5**: 자동 감지 on/off 설정 옵션을 제공한다 (선택적)

## Tasks / Subtasks

- [x] Task 1: 지원완료 페이지 감지 Content Script
  - [x] 1.1 원티드 지원완료 페이지 URL 패턴 및 DOM 분석
  - [x] 1.2 사람인 지원완료 페이지 URL 패턴 및 DOM 분석
  - [x] 1.3 MutationObserver로 DOM 변화 감지

- [x] Task 2: 자동 동기화 로직
  - [x] 2.1 감지 즉시 Background로 전송
  - [x] 2.2 로그인 상태일 경우 즉시 동기화

- [x] Task 3: 뱃지 업데이트
  - [x] 3.1 새 지원 감지 시 뱃지 카운트 증가 (Background에서 처리)

- [x] Task 4: 검증
  - [x] 4.1 빌드 성공 확인

## Dev Notes

### MutationObserver 패턴

지원완료 후 표시되는 성공 메시지를 감지하여 자동 파싱 트리거

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.4]
- [Source: _bmad-output/planning-artifacts/prd.md#FR8]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- wanted-apply-detector.ts 생성 - 원티드 채용공고 페이지에서 지원완료 감지
- saramin-apply-detector.ts 생성 - 사람인 채용공고 페이지에서 지원완료 감지
- MutationObserver로 DOM 변화 감지
- 지원 성공 메시지 패턴 매칭
- 감지 시 즉시 Background로 전송
- 토스트 알림으로 사용자에게 피드백
- 5분 타임아웃으로 리소스 절약

### File List

**신규 파일:**
- `apps/extension/contents/wanted-apply-detector.ts` - 원티드 지원완료 감지
- `apps/extension/contents/saramin-apply-detector.ts` - 사람인 지원완료 감지
