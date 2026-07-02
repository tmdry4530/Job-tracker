import { requireUserId } from '@/lib/auth/get-user'
import { LlmSettingsForm } from '@/components/features/settings/llm-settings-form'
import { loadMaskedLlmSettings } from './actions'

export default async function SettingsPage() {
  // 로그인 필수
  await requireUserId()

  const settings = await loadMaskedLlmSettings()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI 기능에 사용할 API 키를 관리합니다.
        </p>
      </div>

      <LlmSettingsForm settings={settings} />
    </div>
  )
}
