/**
 * Drizzle ORM Schema
 *
 * Supabase → Railway PostgreSQL 마이그레이션.
 * - Auth.js 테이블: users, accounts, sessions, verification_tokens (어댑터 규약: camelCase JS 키)
 * - 앱 테이블: applications, jd_summaries, interview_questions, user_plans, subscriptions, payment_history
 *   (JS 키는 snake_case로 두어 기존 @job-tracker/shared 타입과 그대로 일치시킴)
 * - RLS 제거: 행 격리는 앱 레벨 `WHERE user_id = ...`로 처리
 * - 타임스탬프는 mode:'string'으로 ISO 문자열 반환 (기존 타입과 호환)
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  primaryKey,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ============================================
// Auth.js 테이블 (camelCase JS 키 — @auth/drizzle-adapter 규약)
// ============================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
})

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
)

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true, mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
)

// ============================================
// 앱 테이블 (snake_case JS 키 — 기존 shared 타입과 일치)
// ============================================

/** 북마크/스크랩 공고 (구 지원내역) */
export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    company_name: text('company_name').notNull(),
    position: text('position').notNull(),
    source_url: text('source_url').notNull(),
    jd_content: text('jd_content'),
    status: text('status').notNull().default('saved'),
    is_favorite: boolean('is_favorite').notNull().default(false),
    memo: text('memo'),
    deadline: timestamp('deadline', { withTimezone: true, mode: 'string' }),
    saved_at: timestamp('saved_at', { withTimezone: true, mode: 'string' }),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uniqUserSource: unique('applications_user_source_unique').on(
      t.user_id,
      t.source_url
    ),
    userIdIdx: index('idx_applications_user_id').on(t.user_id),
    platformIdx: index('idx_applications_platform').on(t.platform),
    statusIdx: index('idx_applications_status').on(t.status),
    savedAtIdx: index('idx_applications_saved_at').on(t.saved_at),
    deadlineIdx: index('idx_applications_deadline').on(t.deadline),
    platformCheck: check(
      'applications_platform_check',
      sql`${t.platform} IN ('wanted', 'saramin')`
    ),
    statusCheck: check(
      'applications_status_check',
      sql`${t.status} IN ('saved', 'applied', 'closed')`
    ),
  })
)

/** JD AI 요약 */
export const jdSummaries = pgTable(
  'jd_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    application_id: uuid('application_id')
      .notNull()
      .unique()
      .references(() => applications.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    summary: text('summary').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    applicationIdx: index('idx_jd_summaries_application_id').on(t.application_id),
    userIdIdx: index('idx_jd_summaries_user_id').on(t.user_id),
  })
)

/** 면접 예상 질문 */
export const interviewQuestions = pgTable(
  'interview_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    application_id: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    category: text('category'),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    applicationIdx: index('idx_interview_questions_application_id').on(
      t.application_id
    ),
    userIdIdx: index('idx_interview_questions_user_id').on(t.user_id),
    categoryCheck: check(
      'interview_questions_category_check',
      sql`${t.category} IS NULL OR ${t.category} IN ('technical', 'experience', 'situational', 'general')`
    ),
  })
)

/** 사용자 플랜 (free / premium) */
export const userPlans = pgTable(
  'user_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    plan_type: text('plan_type').notNull().default('free'),
    application_limit: integer('application_limit').notNull().default(100),
    premium_started_at: timestamp('premium_started_at', {
      withTimezone: true,
      mode: 'string',
    }),
    premium_expires_at: timestamp('premium_expires_at', {
      withTimezone: true,
      mode: 'string',
    }),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIdIdx: index('idx_user_plans_user_id').on(t.user_id),
    planTypeCheck: check(
      'user_plans_plan_type_check',
      sql`${t.plan_type} IN ('free', 'premium')`
    ),
  })
)

/** 구독 (토스페이먼츠 정기결제) */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    billing_key: text('billing_key').notNull(),
    customer_key: text('customer_key').notNull(),
    card_company: text('card_company'),
    card_number: text('card_number'),
    status: text('status').notNull().default('active'),
    current_period_start: timestamp('current_period_start', {
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
    current_period_end: timestamp('current_period_end', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .default(sql`(now() + interval '1 month')`),
    cancelled_at: timestamp('cancelled_at', {
      withTimezone: true,
      mode: 'string',
    }),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIdIdx: index('idx_subscriptions_user_id').on(t.user_id),
    statusIdx: index('idx_subscriptions_status').on(t.status),
    statusCheck: check(
      'subscriptions_status_check',
      sql`${t.status} IN ('active', 'cancelled', 'expired', 'past_due')`
    ),
  })
)

/** 결제 내역 */
export const paymentHistory = pgTable(
  'payment_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subscription_id: uuid('subscription_id').references(() => subscriptions.id, {
      onDelete: 'set null',
    }),
    payment_key: text('payment_key').notNull().unique(),
    order_id: text('order_id').notNull().unique(),
    amount: integer('amount').notNull(),
    status: text('status').notNull().default('pending'),
    payment_method: text('payment_method'),
    paid_at: timestamp('paid_at', { withTimezone: true, mode: 'string' }),
    failed_reason: text('failed_reason'),
    receipt_url: text('receipt_url'),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIdIdx: index('idx_payment_history_user_id').on(t.user_id),
    subscriptionIdx: index('idx_payment_history_subscription_id').on(
      t.subscription_id
    ),
    createdAtIdx: index('idx_payment_history_created_at').on(t.created_at),
    statusCheck: check(
      'payment_history_status_check',
      sql`${t.status} IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')`
    ),
  })
)
