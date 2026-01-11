import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { SessionSync } from '@/components/features/auth/session-sync'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Job Application Tracker',
  description: '채용 플랫폼 지원 현황 통합 관리 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionSync />
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
