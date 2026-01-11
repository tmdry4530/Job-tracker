'use client'

import { useEffect, useState } from 'react'
import type { PaymentHistory } from '@job-tracker/shared'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Receipt, ExternalLink } from 'lucide-react'

const statusConfig = {
  pending: { label: '대기', variant: 'secondary' as const },
  completed: { label: '완료', variant: 'default' as const },
  failed: { label: '실패', variant: 'destructive' as const },
  cancelled: { label: '취소', variant: 'outline' as const },
  refunded: { label: '환불', variant: 'outline' as const },
}

export function PaymentHistoryList() {
  const [history, setHistory] = useState<PaymentHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch('/api/payment/history?limit=20')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error)
        }

        setHistory(data.history)
      } catch (err) {
        setError(err instanceof Error ? err.message : '결제 내역을 불러올 수 없습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            결제 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            결제 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            결제 내역
          </CardTitle>
          <CardDescription>결제 내역이 없습니다.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          결제 내역
        </CardTitle>
        <CardDescription>최근 결제 내역입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>금액</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>영수증</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((payment) => {
              const status = statusConfig[payment.status]
              const date = payment.paid_at
                ? new Date(payment.paid_at).toLocaleDateString('ko-KR')
                : new Date(payment.created_at).toLocaleDateString('ko-KR')

              return (
                <TableRow key={payment.id}>
                  <TableCell>{date}</TableCell>
                  <TableCell>{payment.amount.toLocaleString()}원</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {payment.receipt_url ? (
                      <a
                        href={payment.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        보기
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
