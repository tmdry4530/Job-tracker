'use client'

import { useState, useTransition } from 'react'
import { KeyRound, Trash2, Loader2, ExternalLink, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  saveLlmSettings,
  deleteLlmSettings,
  type MaskedLlmSettings,
} from '@/app/(dashboard)/settings/actions'

interface LlmSettingsFormProps {
  settings: MaskedLlmSettings
}

export function LlmSettingsForm({ settings }: LlmSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  // 키가 저장되어 있으면 기본은 마스킹 표시 상태, 없으면 바로 입력 모드
  const [isEditing, setIsEditing] = useState(!settings.hasKey)

  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl ?? '')
  const [model, setModel] = useState(settings.model ?? '')

  function handleSave() {
    if (!apiKey.trim()) {
      toast.error('API 키를 입력해주세요')
      return
    }

    startTransition(async () => {
      const result = await saveLlmSettings({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined,
        model: model.trim() || undefined,
      })

      if (result.success) {
        toast.success('API 키가 저장되었습니다')
        setApiKey('')
        setIsEditing(false)
      } else {
        toast.error(result.error ?? 'API 키 저장에 실패했습니다')
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLlmSettings()

      if (result.success) {
        toast.success('API 키가 삭제되었습니다')
        setApiKey('')
        setBaseUrl('')
        setModel('')
        setIsEditing(true)
      } else {
        toast.error(result.error ?? 'API 키 삭제에 실패했습니다')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          AI API 키 (BYOK)
        </CardTitle>
        <CardDescription>
          JD 요약과 면접 예상 질문 생성에 사용할 본인 API 키를 등록하세요. AI
          사용 비용은 등록한 본인 키로 청구됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 안내: Z.ai GLM 키 발급 */}
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
          <p>
            Z.ai GLM API 키는{' '}
            <a
              href="https://z.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              z.ai
              <ExternalLink className="h-3 w-3" />
            </a>
            에서 발급받을 수 있습니다.
          </p>
        </div>

        {/* 키가 저장되어 있고 편집 모드가 아니면 마스킹 표시 */}
        {settings.hasKey && !isEditing ? (
          <div className="space-y-2">
            <Label>등록된 API 키</Label>
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
              <code className="font-mono text-sm">{settings.maskedKey}</code>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={isPending}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  변경
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1 h-4 w-4" />
                  )}
                  삭제
                </Button>
              </div>
            </div>
            {(settings.baseUrl || settings.model) && (
              <div className="space-y-1 pt-2 text-sm text-muted-foreground">
                {settings.baseUrl && (
                  <p>
                    Base URL:{' '}
                    <code className="font-mono">{settings.baseUrl}</code>
                  </p>
                )}
                {settings.model && (
                  <p>
                    모델: <code className="font-mono">{settings.model}</code>
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API 키</Label>
              <Input
                id="apiKey"
                type="password"
                autoComplete="off"
                placeholder="발급받은 API 키를 붙여넣으세요"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL (선택)</Label>
              <Input
                id="baseUrl"
                type="text"
                autoComplete="off"
                placeholder="https://api.z.ai/api/anthropic"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                비워두면 기본 Z.ai 엔드포인트를 사용합니다.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">모델 (선택)</Label>
              <Input
                id="model"
                type="text"
                autoComplete="off"
                placeholder="glm-4.6"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                비워두면 기본 모델(glm-4.6)을 사용합니다.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                저장
              </Button>
              {settings.hasKey && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setApiKey('')
                    setBaseUrl(settings.baseUrl ?? '')
                    setModel(settings.model ?? '')
                    setIsEditing(false)
                  }}
                  disabled={isPending}
                >
                  취소
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
