CREATE TABLE "alert_brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"brand_id" smallint NOT NULL,
	CONSTRAINT "alert_brand_alert_id_brand_id_key" UNIQUE("alert_id","brand_id")
);
--> statement-breakpoint
ALTER TABLE "alert_brands" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "alert_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"model_id" smallint NOT NULL,
	CONSTRAINT "alert_model_alert_id_model_id_key" UNIQUE("alert_id","model_id")
);
--> statement-breakpoint
ALTER TABLE "alert_models" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alerts" DROP CONSTRAINT "alerts_brand_id_brands_id_fk";
--> statement-breakpoint
ALTER TABLE "alerts" DROP CONSTRAINT "alerts_model_id_vehicle_models_id_fk";
--> statement-breakpoint
ALTER TABLE "alert_brands" ADD CONSTRAINT "alert_brand_alert_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_brands" ADD CONSTRAINT "alert_brand_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_models" ADD CONSTRAINT "alert_model_alert_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_models" ADD CONSTRAINT "alert_model_model_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alert_brand_alert_id_idx" ON "alert_brands" USING btree ("alert_id");--> statement-breakpoint
CREATE INDEX "alert_model_alert_id_idx" ON "alert_models" USING btree ("alert_id");--> statement-breakpoint
ALTER TABLE "alerts" DROP COLUMN "brand_id";--> statement-breakpoint
ALTER TABLE "alerts" DROP COLUMN "model_id";--> statement-breakpoint
CREATE POLICY "enable all crud for the alert owners" ON "alert_brands" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (
        select 1 from alerts a
        where a.id = "alert_brands"."alert_id"
        and a.account_id = (select auth.uid())
      )) WITH CHECK (exists (
        select 1 from alerts a
        where a.id = "alert_brands"."alert_id"
        and a.account_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "enable all crud for the alert owners" ON "alert_models" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (
        select 1 from alerts a
        where a.id = "alert_models"."alert_id"
        and a.account_id = (select auth.uid())
      )) WITH CHECK (exists (
        select 1 from alerts a
        where a.id = "alert_models"."alert_id"
        and a.account_id = (select auth.uid())
      ));