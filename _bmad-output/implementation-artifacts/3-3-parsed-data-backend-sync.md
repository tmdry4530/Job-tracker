# Story 3.3: 파싱 데이터 백엔드 동기화

Status: done

## Story

As a **사용자**,
I want **Extension에서 파싱한 지원 내역이 백엔드에 자동으로 저장되어**,
so that **Dashboard에서 모든 지원 현황을 볼 수 있다**.

## Acceptance Criteria

1. **AC1**: 파싱 완료 후 "동기화" 버튼을 클릭하면 Supabase에 데이터가 저장된다
2. **AC2**: 중복 데이터는 source_url 기준으로 스킵하거나 업데이트한다
3. **AC3**: 동기화 성공/실패 결과를 Extension UI에 표시한다
4. **AC4**: Supabase Realtime으로 Dashboard에 업데이트가 전파된다 (I3)
5. **AC5**: 로그인되지 않은 상태에서는 동기화 버튼이 비활성화된다

## Tasks / Subtasks

- [x] Task 1: Background Service Worker에서 동기화 로직 구현 (AC: #1, #2)
  - [x] 1.1 `syncApplicationsToSupabase` 함수 구현
  - [x] 1.2 Upsert 로직 구현 (source_url 기준)
  - [x] 1.3 Batch insert 처리

- [x] Task 2: Popup UI에서 동기화 트리거 (AC: #1, #3, #5)
  - [x] 2.1 "동기화" 버튼 추가
  - [x] 2.2 로그인 상태에 따른 버튼 활성화/비활성화
  - [x] 2.3 동기화 진행 상태 표시
  - [x] 2.4 동기화 결과 표시 (성공/실패)

- [x] Task 3: 메시지 타입 확장
  - [x] 3.1 SYNC_REQUEST, SYNC_COMPLETED, SYNC_FAILED 메시지 타입 추가

- [x] Task 4: 검증
  - [x] 4.1 빌드 성공 확인
  - [x] 4.2 린트 통과 확인

## Dev Notes

### Upsert 전략

```sql
ON CONFLICT (user_id, source_url) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  position = EXCLUDED.position,
  status = EXCLUDED.status,
  updated_at = now()
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR7]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- Background에 syncApplicationsToSupabase 함수 구현 - Upsert 로직
- Batch 처리 (10개씩) - 대량 데이터 효율적 처리
- Popup UI 확장 - 동기화 버튼, 대기 중인 지원 내역 표시
- 동기화 진행 상태 및 결과 표시
- 타입 확장 - SyncMessage, PopupMessage

### File List

**수정 파일:**
- `apps/extension/lib/types.ts` - SyncMessage, PopupMessage 타입 추가
- `apps/extension/background.ts` - 동기화 로직 추가 (handleSyncRequest, syncApplicationsToSupabase)
- `apps/extension/popup.tsx` - 동기화 UI 추가
