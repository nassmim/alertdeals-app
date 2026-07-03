ALTER TABLE "matched_ads" DROP CONSTRAINT "matched_ad_alert_id_fk";
--> statement-breakpoint
ALTER TABLE "matched_ads" ALTER COLUMN "alert_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "matched_ads" ADD CONSTRAINT "matched_ad_alert_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE set null ON UPDATE no action;