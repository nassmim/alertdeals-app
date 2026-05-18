CREATE TABLE "matched_ads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"alert_id" uuid NOT NULL,
	"ad_id" uuid NOT NULL,
	"matched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matched_ads_account_id_ad_id_key" UNIQUE("account_id","ad_id")
);
--> statement-breakpoint
ALTER TABLE "matched_ads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "matched_ads" ADD CONSTRAINT "matched_ad_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matched_ads" ADD CONSTRAINT "matched_ad_alert_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matched_ads" ADD CONSTRAINT "matched_ad_ad_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matched_ads_account_id_idx" ON "matched_ads" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "matched_ads_matched_at_idx" ON "matched_ads" USING btree ("matched_at");--> statement-breakpoint
CREATE POLICY "enable read for account owner" ON "matched_ads" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("matched_ads"."account_id" = (select auth.uid()));