import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보처리방침 - Job Application Tracker',
  description: 'Job Application Tracker 개인정보처리방침',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-2">Job Application Tracker 개인정보처리방침</h1>
        <p className="text-muted-foreground mb-8">최종 수정일: 2026년 1월 5일</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">수집하는 정보</h2>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">계정 정보</strong>: 이메일 주소, 암호화된 비밀번호</li>
              <li><strong className="text-foreground">지원 내역 정보</strong>: 원티드, 사람인에서 파싱한 지원 공고 정보 (회사명, 포지션, 지원일, 상태)</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">정보 사용 목적</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>사용자 인증 및 계정 관리</li>
              <li>지원 현황 대시보드 표시</li>
              <li>여러 기기 간 데이터 동기화</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">정보 공유</h2>
            <p className="text-muted-foreground">
              수집된 개인정보는 제3자와 공유되지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">데이터 보관</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>데이터는 Supabase 클라우드에 안전하게 저장됩니다</li>
              <li>사용자는 언제든지 계정 및 데이터를 삭제할 수 있습니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">문의</h2>
            <p className="text-muted-foreground">
              <a href="mailto:chamdom@example.com" className="text-primary hover:underline">
                chamdom@example.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
