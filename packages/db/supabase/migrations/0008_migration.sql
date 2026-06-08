CREATE TYPE "public"."plan_interval" AS ENUM('month', 'year');--> statement-breakpoint
CREATE TABLE "plans" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"stripe_price_id" varchar(255) NOT NULL,
	"price_eur" integer NOT NULL,
	"interval" "plan_interval" DEFAULT 'month' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "plans_stripe_price_id_unique" UNIQUE("stripe_price_id")
);
--> statement-breakpoint
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "enable select for authenticated users" ON "plans" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);