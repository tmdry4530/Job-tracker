/**
 * Database Types
 * Supabase 데이터베이스 타입 정의
 */

import type {
  Application,
  ApplicationInsert,
  ApplicationUpdate,
  ApplicationStatus,
  JdSummary,
  JdSummaryInsert,
  JdSummaryUpdate,
  InterviewQuestion,
  InterviewQuestionInsert,
  InterviewQuestionUpdate,
  QuestionCategory,
} from './application';
import type { Platform } from './platform';

export interface Database {
  public: {
    Tables: {
      applications: {
        Row: Application;
        Insert: ApplicationInsert;
        Update: ApplicationUpdate;
      };
      jd_summaries: {
        Row: JdSummary;
        Insert: JdSummaryInsert;
        Update: JdSummaryUpdate;
      };
      interview_questions: {
        Row: InterviewQuestion;
        Insert: InterviewQuestionInsert;
        Update: InterviewQuestionUpdate;
      };
    };
  };
}

// Re-export for convenience
export type {
  Platform,
  ApplicationStatus,
  Application,
  ApplicationInsert,
  ApplicationUpdate,
  JdSummary,
  JdSummaryInsert,
  JdSummaryUpdate,
  InterviewQuestion,
  InterviewQuestionInsert,
  InterviewQuestionUpdate,
  QuestionCategory,
};
