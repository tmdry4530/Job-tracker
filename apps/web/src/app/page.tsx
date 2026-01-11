import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface HomePageProps {
  searchParams: Promise<{ code?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams

  // OAuth 코드가 있으면 세션 교환 후 리다이렉트
  if (params.code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(params.code)

    if (error) {
      console.error('[Home] OAuth code exchange error:', error)
      redirect(`/login?error=${encodeURIComponent(error.message)}`)
    }

    redirect('/applications')
  }

  redirect('/applications')
}
