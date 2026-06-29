ALTER TABLE "applications" DROP CONSTRAINT "applications_platform_check";--> statement-breakpoint
ALTER TABLE "interview_questions" ADD COLUMN "answer" text;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_platform_check" CHECK ("applications"."platform" IN ('wanted', 'saramin', 'jobkorea'));