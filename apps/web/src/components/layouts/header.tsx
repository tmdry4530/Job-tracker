import { LogoutButton } from '@/components/features/auth/logout-button';

/**
 * 대시보드 헤더 컴포넌트
 * - 앱 제목
 * - 로그아웃 버튼
 */
export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Job Application Tracker</h1>
        <LogoutButton />
      </div>
    </header>
  );
}
