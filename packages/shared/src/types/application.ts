/**
 * Application Types
 * 지원 공고 관련 타입 정의
 */

import type { Platform } from './platform';

export type ApplicationStatus =
  | 'applied'
  | 'document_passed'
  | 'interview'
  | 'accepted'
  | 'rejected';

export const APPLICATION_STATUSES = [
  'applied',
  'document_passed',
  'interview',
  'accepted',
  'rejected',
] as const;

export type ApplicationStatusType = (typeof APPLICATION_STATUSES)[number];

export interface Application {
  id: string;
  user_id: string;
  platform: Platform;
  company_name: string;
  position: string;
  source_url: string;
  jd_content: string | null;
  status: ApplicationStatus;
  applied_at: string | null;
  is_bookmarked: boolean;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export type ApplicationInsert = Omit<Application, 'id' | 'created_at' | 'updated_at' | 'is_bookmarked' | 'memo'> & {
  id?: string;
  is_bookmarked?: boolean;
  memo?: string | null;
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
  category: QuestionCategory | null;
  created_at: string;
}

export type InterviewQuestionInsert = Omit<InterviewQuestion, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type InterviewQuestionUpdate = Partial<InterviewQuestionInsert>;
