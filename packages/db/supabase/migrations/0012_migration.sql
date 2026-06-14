CREATE TABLE "price_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_analyses_ad_id_key" UNIQUE("ad_id")
);
--> statement-breakpoint
ALTER TABLE "price_analyses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "price_analyses" ADD CONSTRAINT "price_analysis_ad_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_analyses_ad_id_idx" ON "price_analyses" USING btree ("ad_id");--> statement-breakpoint
CREATE POLICY "enable read for authenticated users" ON "price_analyses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "enable insert for authenticated users" ON "price_analyses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);