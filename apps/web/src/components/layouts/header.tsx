import { LogoutButton } from '@/components/features/auth/logout-button';
import { ThemeToggle } from '@/components/features/theme';

/**
 * 대시보드 헤더 컴포넌트
 * - 앱 제목
 * - 테마 토글
 * - 로그아웃 버튼
 */
export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Job Application Tracker</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
