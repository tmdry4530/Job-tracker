import Link from 'next/link';
import { Settings } from 'lucide-react';
import { LogoutButton } from '@/components/features/auth/logout-button';
import { ThemeToggle } from '@/components/features/theme';
import { Button } from '@/components/ui/button';

/**
 * 대시보드 헤더 컴포넌트
 * - 앱 제목 (지원목록으로 이동)
 * - 설정 링크
 * - 테마 토글
 * - 로그아웃 버튼
 */
export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/applications" className="text-xl font-bold">
          Job Application Tracker
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings" className="flex items-center gap-1.5">
              <Settings className="h-4 w-4" />
              설정
            </Link>
          </Button>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
