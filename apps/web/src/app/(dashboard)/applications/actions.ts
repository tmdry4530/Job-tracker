'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ApplicationStatusSchema } from '@job-tracker/shared'

const UuidSchema = z.string().uuid('유효하지 않은 ID입니다')

const UpdateStatusSchema = z.object({
  id: UuidSchema,
  status: ApplicationStatusSchema,
})

const DeleteApplicationSchema = z.object({
  id: UuidSchema,
})

export async function updateApplicationStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  // Zod 검증
  const parsed = UpdateStatusSchema.safeParse({ id, status })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || '입력값이 유효하지 않습니다' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('applications')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/applications')
  return { success: true }
}

export async function deleteApplication(
  id: string
): Promise<{ success: boolean; error?: string }> {
  // Zod 검증
  const parsed = DeleteApplicationSchema.safeParse({ id })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || '유효하지 않은 ID입니다' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', parsed.data.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/applications')
  return { success: true }
}

const ToggleBookmarkSchema = z.object({
  id: UuidSchema,
  isBookmarked: z.boolean(),
})

export async function toggleBookmark(
  id: string,
  isBookmarked: boolean
): Promise<{ success: boolean; error?: string }> {
  const parsed = ToggleBookmarkSchema.safeParse({ id, isBookmarked })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || '입력값이 유효하지 않습니다' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('applications')
    .update({ is_bookmarked: parsed.data.isBookmarked })
    .eq('id', parsed.data.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/applications')
  revalidatePath(`/applications/${id}`)
  return { success: true }
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

  const supabase = await createClient()

  const { error } = await supabase
    .from('applications')
    .update({ memo: parsed.data.memo })
    .eq('id', parsed.data.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/applications')
  revalidatePath(`/applications/${id}`)
  return { success: true }
}
