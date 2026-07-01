'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/get-user'
import { ApplicationStatusSchema } from '@job-tracker/shared'

const UuidSchema = z.string().uuid('유효하지 않은 ID입니다')

const UpdateStatusSchema = z.object({
  id: UuidSchema,
  status: ApplicationStatusSchema,
})

const DeleteApplicationSchema = z.object({
  id: UuidSchema,
})

const DeleteApplicationsSchema = z
  .array(UuidSchema)
  .min(1, '삭제할 항목을 선택해주세요')
  .max(200, '한 번에 최대 200건까지 삭제할 수 있습니다')

export async function updateApplicationStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  // Zod 검증
  const parsed = UpdateStatusSchema.safeParse({ id, status })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || '입력값이 유효하지 않습니다' }
  }

  try {
    const userId = await requireUserId()

    await db
      .update(applications)
      .set({ status: parsed.data.status })
      .where(
        and(eq(applications.id, parsed.data.id), eq(applications.user_id, userId))
      )

    revalidatePath('/applications')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '상태 변경에 실패했습니다' }
  }
}

export async function deleteApplication(
  id: string
): Promise<{ success: boolean; error?: string }> {
  // Zod 검증
  const parsed = DeleteApplicationSchema.safeParse({ id })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || '유효하지 않은 ID입니다' }
  }

  try {
    const userId = await requireUserId()

    await db
      .delete(applications)
      .where(
        and(eq(applications.id, parsed.data.id), eq(applications.user_id, userId))
      )

    revalidatePath('/applications')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '삭제에 실패했습니다' }
  }
}

export async function deleteApplications(
  ids: string[]
): Promise<{ success: boolean; deleted?: number; error?: string }> {
  // Zod 검증
  const parsed = DeleteApplicationsSchema.safeParse(ids)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || '유효하지 않은 ID입니다' }
  }

  try {
    const userId = await requireUserId()

    await db
      .delete(applications)
      .where(
        and(inArray(applications.id, parsed.data), eq(applications.user_id, userId))
      )

    revalidatePath('/applications')
    return { success: true, deleted: parsed.data.length }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '삭제에 실패했습니다' }
  }
}

const ToggleFavoriteSchema = z.object({
  id: UuidSchema,
  isFavorite: z.boolean(),
})

export async function toggleFavorite(
  id: string,
  isFavorite: boolean
): Promise<{ success: boolean; error?: string }> {
  const parsed = ToggleFavoriteSchema.safeParse({ id, isFavorite })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || '입력값이 유효하지 않습니다' }
  }

  try {
    const userId = await requireUserId()

    await db
      .update(applications)
      .set({ is_favorite: parsed.data.isFavorite })
      .where(
        and(eq(applications.id, parsed.data.id), eq(applications.user_id, userId))
      )

    revalidatePath('/applications')
    revalidatePath(`/applications/${id}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '즐겨찾기 변경에 실패했습니다' }
  }
}

const UpdateMemoSchema = z.object({
  id: UuidSchema,
  memo: z.string().max(2000, '메모는 2000자 이내로 작성해주세요').nullable(),
})

export async function updateMemo(
  id: string,
  memo: string | null
): Promise<{ success: boolean; error?: string }> {
  const parsed = UpdateMemoSchema.safeParse({ id, memo })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || '입력값이 유효하지 않습니다' }
  }

  try {
    const userId = await requireUserId()

    await db
      .update(applications)
      .set({ memo: parsed.data.memo })
      .where(
        and(eq(applications.id, parsed.data.id), eq(applications.user_id, userId))
      )

    revalidatePath('/applications')
    revalidatePath(`/applications/${id}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '메모 저장에 실패했습니다' }
  }
}
