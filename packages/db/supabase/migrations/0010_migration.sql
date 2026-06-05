ALTER TABLE "accounts" ADD COLUMN "is_trial" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "trial_end_date" timestamp with time zone;