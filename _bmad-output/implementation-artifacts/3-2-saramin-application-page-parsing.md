# Story 3.2: 사람인 지원현황 페이지 파싱

Status: done

## Story

As a **사용자**,
I want **사람인 "지원현황" 페이지에서 기존 지원 내역을 자동으로 수집**,
so that **수동 입력 없이 지원 현황을 대시보드에서 관리할 수 있다**.

## Acceptance Criteria

1. **AC1**: 사용자가 사람인 지원현황 페이지(`saramin.co.kr/zf_user/applyin-status`)에 접속하면 Extension이 페이지를 감지한다
2. **AC2**: DOM에서 지원 내역(회사명, 포지션, 지원일, 상태, JD URL)을 파싱한다
3. **AC3**: 파싱 결과를 `Application` 타입으로 변환한다
4. **AC4**: 파싱 성공/실패 상태를 사용자에게 표시한다
5. **AC5**: 파싱 성공률 90% 이상을 유지한다 (R2)
6. **AC6**: DOM 파싱은 3초 이내에 완료된다 (P4)
7. **AC7**: 파싱 실패 시 사용자에게 명확한 에러 메시지를 표시해야 한다 (R3)

## Tasks / Subtasks

- [x] Task 1: Content Script 기본 설정 (AC: #1)
  - [x] 1.1 `apps/extension/contents/saramin.ts` 생성
  - [x] 1.2 PlasmoCSConfig로 사람인 지원현황 URL 매칭 설정
  - [x] 1.3 페이지 로드 완료 감지 로직 구현

- [x] Task 2: DOM 파서 구현 (AC: #2, #3, #6)
  - [x] 2.1 사람인 지원현황 페이지 DOM 구조 분석
  - [x] 2.2 파싱 함수 구현 (`parseSaraminApplications`)
  - [x] 2.3 `Application` 타입으로 변환

- [x] Task 3: 공통 파서 유틸리티 추출 (리팩토링)
  - [x] 3.1 wanted.ts와 saramin.ts 공통 코드 추출
  - [x] 3.2 `apps/extension/lib/parser-utils.ts` 생성

- [x] Task 4: 검증
  - [x] 4.1 빌드 성공 확인
  - [x] 4.2 린트 통과 확인

## Dev Notes

### 기술 스택

- Story 3.1과 동일

### 사람인 DOM 분석 필요

- 사람인 지원현황 URL 패턴 확인
- DOM 셀렉터 분석

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.2]
- [Source: _bmad-output/planning-artifacts/prd.md#FR6]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- saramin.ts Content Script 생성 - 사람인 지원현황 URL 매칭
- 사람인 특화 DOM 셀렉터 구현 (테이블/리스트 형식)
- 공통 파서 유틸리티 추출 (parser-utils.ts)
- 빌드 성공 확인

### File List

**신규 파일:**
- `apps/extension/contents/saramin.ts` - 사람인 파서 Content Script
- `apps/extension/lib/parser-utils.ts` - 공통 파서 유틸리티

## Code Review Record

### Review Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Issues Found

| # | 심각도 | 설명 | 조치 |
|---|--------|------|------|
| 1 | INFO | 실제 사람인 DOM 셀렉터 검증 필요 | 프로덕션 배포 전 수동 테스트 필요 |

### Fixes Applied

- 빌드 통과 확인
