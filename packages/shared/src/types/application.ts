/**
 * Bookmark Types
 * 북마크/스크랩 공고 관련 타입 정의
 */

import type { Platform } from './platform';

/**
 * 북마크 상태
 * - saved: 저장됨 (기본값)
 * - applied: 지원함
 * - closed: 마감됨
 */
export type BookmarkStatus = 'saved' | 'applied' | 'closed';

export const BOOKMARK_STATUSES = ['saved', 'applied', 'closed'] as const;

export type BookmarkStatusType = (typeof BOOKMARK_STATUSES)[number];

// 하위 호환성을 위해 기존 타입 별칭 유지
export type ApplicationStatus = BookmarkStatus;
export const APPLICATION_STATUSES = BOOKMARK_STATUSES;
export type ApplicationStatusType = BookmarkStatusType;

export interface Application {
  id: string;
  user_id: string;
  platform: Platform;
  company_name: string;
  position: string;
  source_url: string;
  jd_content: string | null;
  status: BookmarkStatus;
  saved_at: string | null;
  is_favorite: boolean;
  memo: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

// 하위 호환성을 위한 별칭
export type Bookmark = Application;

export type ApplicationInsert = Omit<Application, 'id' | 'created_at' | 'updated_at' | 'is_favorite' | 'memo' | 'deadline'> & {
  id?: string;
  is_favorite?: boolean;
  memo?: string | null;
  deadline?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ApplicationUpdate = Partial<ApplicationInsert>;

export type QuestionCategory =
  | 'technical'
  | 'experience'
  | 'situational'
  | 'general';

export const QUESTION_CATEGORIES = [
  'technical',
  'experience',
  'situational',
  'general',
] as const;

export interface JdSummary {
  id: string;
  application_id: string;
  user_id: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export type JdSummaryInsert = Omit<JdSummary, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type JdSummaryUpdate = Partial<JdSummaryInsert>;

export interface InterviewQuestion {
  id: string;
  application_id: string;
  user_id: string;
  question: string;
  answer: string | null;
  category: QuestionCategory | null;
  created_at: string;
}

export type InterviewQuestionInsert = Omit<InterviewQuestion, 'id' | 'created_at' | 'answer'> & {
  id?: string;
  answer?: string | null;
  created_at?: string;
};

export type InterviewQuestionUpdate = Partial<InterviewQuestionInsert>;
