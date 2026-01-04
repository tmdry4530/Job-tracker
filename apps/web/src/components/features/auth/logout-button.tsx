'use client';

import { useState } from 'react';
import { signOut } from '@/app/(auth)/logout/actions';
import { Button } from '@/components/ui/button';

/**
 * 로그아웃 버튼 컴포넌트
 * - 클릭 시 signOut Server Action 호출
 * - 로딩 상태 표시
 * - 에러 발생 시 사용자 피드백 제공
 */
export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setIsLoading(true);
    setError(null);
    try {
      await signOut();
      // redirect()가 성공하면 이 라인에 도달하지 않음
    } catch (err) {
      // redirect()는 NEXT_REDIRECT 에러를 던지며, Next.js가 내부적으로 처리
      // 실제 네트워크 에러인 경우에만 사용자에게 표시
      const isRedirectError =
        err instanceof Error && err.message.includes('NEXT_REDIRECT');
      if (!isRedirectError) {
        setError('로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      // 네트워크 오류 시에도 버튼 상태 복구
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-sm text-destructive">{error}</span>
      )}
      <Button
        variant="ghost"
        onClick={handleLogout}
        disabled={isLoading}
      >
        {isLoading ? '로그아웃 중...' : '로그아웃'}
      </Button>
    </div>
  );
}
