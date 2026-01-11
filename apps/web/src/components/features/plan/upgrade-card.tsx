'use client'

import { Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PLAN_LIMITS } from '@job-tracker/shared'

export function UpgradeCard() {
  const premiumFeatures = PLAN_LIMITS.premium.features

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <CardTitle>Premium으로 업그레이드</CardTitle>
        </div>
        <CardDescription>
          더 많은 기능으로 취업 준비를 효율적으로 관리하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {premiumFeatures.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          onClick={() => {
            // TODO: 결제 페이지로 이동 또는 결제 모달 표시
            alert('결제 기능은 추후 연동 예정입니다.')
          }}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Premium 시작하기
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          언제든지 취소 가능 | 7일 무료 체험
        </p>
      </CardContent>
    </Card>
  )
}
