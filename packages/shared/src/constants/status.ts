/**
 * Status Constants
 * 북마크 상태 관련 상수
 */

import type { BookmarkStatus, QuestionCategory } from '../types';

export const STATUS_LABELS: Record<string, string> = {
  saved: '저장됨',
  applied: '지원함',
  closed: '마감됨',
  // Legacy status fallbacks
  document_passed: '지원함',
  interview: '지원함',
  accepted: '지원함',
  rejected: '마감됨',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  saved: '#6B7280',       // gray-500
  applied: '#3B82F6',     // blue-500
  closed: '#EF4444',      // red-500
  // Legacy status fallbacks
  document_passed: '#3B82F6',
  interview: '#3B82F6',
  accepted: '#3B82F6',
  rejected: '#EF4444',
} as const;

export const STATUS_ORDER: BookmarkStatus[] = [
  'saved',
  'applied',
  'closed',
] as const;

export const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  technical: '기술 질문',
  experience: '경험 질문',
  situational: '상황 질문',
  general: '일반 질문',
} as const;
