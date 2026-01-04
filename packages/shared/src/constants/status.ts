/**
 * Status Constants
 * 지원 상태 관련 상수
 */

import type { ApplicationStatus, QuestionCategory } from '../types';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: '지원완료',
  document_passed: '서류통과',
  interview: '면접진행',
  accepted: '합격',
  rejected: '불합격',
} as const;

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  applied: '#6B7280',     // gray-500
  document_passed: '#3B82F6', // blue-500
  interview: '#8B5CF6',   // violet-500
  accepted: '#22C55E',    // green-500
  rejected: '#EF4444',    // red-500
} as const;

export const STATUS_ORDER: ApplicationStatus[] = [
  'applied',
  'document_passed',
  'interview',
  'accepted',
  'rejected',
] as const;

export const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  technical: '기술 질문',
  experience: '경험 질문',
  situational: '상황 질문',
  general: '일반 질문',
} as const;
