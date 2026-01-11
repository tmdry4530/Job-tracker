'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signInWithOAuth } from '@/app/(auth)/login/actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function LoginForm() {
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get('error')
  const [isLoading, setIsLoading] = useState<'google' | 'kakao' | null>(null)

  async function handleOAuthLogin(provider: 'google' | 'kakao') {
    setIsLoading(provider)
    try {
      await signInWithOAuth(provider)
    } catch {
      // redirect가 발생하면 여기까지 오지 않음
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">로그인</CardTitle>
        <CardDescription>
          소셜 계정으로 간편하게 로그인하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="rounded-md bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}

        {/* Google 로그인 */}
        <Button
          variant="outline"
          className="w-full h-12 gap-3"
          onClick={() => handleOAuthLogin('google')}
          disabled={isLoading !== null}
        >
          {isLoading === 'google' ? (
            <LoadingSpinner />
          ) : (
            <GoogleIcon />
          )}
          <span>Google로 계속하기</span>
        </Button>

        {/* Kakao 로그인 */}
        <Button
          variant="outline"
          className="w-full h-12 gap-3 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] border-[#FEE500]"
          onClick={() => handleOAuthLogin('kakao')}
          disabled={isLoading !== null}
        >
          {isLoading === 'kakao' ? (
            <LoadingSpinner />
          ) : (
            <KakaoIcon />
          )}
          <span>카카오로 계속하기</span>
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Job Application Tracker
            </span>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          로그인하면{' '}
          <a href="/terms" className="underline hover:text-primary">
            이용약관
          </a>
          {' '}및{' '}
          <a href="/privacy" className="underline hover:text-primary">
            개인정보처리방침
          </a>
          에 동의하게 됩니다.
        </p>
      </CardContent>
    </Card>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function KakaoIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#191919">
      <path d="M12 3C6.48 3 2 6.48 2 10.5c0 2.55 1.69 4.79 4.22 6.08-.18.66-.67 2.4-.77 2.77-.12.47.17.47.36.34.15-.1 2.37-1.6 3.33-2.25.62.09 1.26.14 1.86.14 5.52 0 10-3.48 10-7.58S17.52 3 12 3z" />
    </svg>
  )
}
