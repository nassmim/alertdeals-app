CREATE TYPE "public"."ad_source" AS ENUM('leboncoin', 'autoscout24', 'lacentrale', 'paruvendu');--> statement-breakpoint
ALTER TABLE "ads" DROP CONSTRAINT "ads_original_ad_id_unique";--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN "source" "ad_source" DEFAULT 'leboncoin' NOT NULL;--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN "unmapped_values" jsonb;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "normalized_name" text GENERATED ALWAYS AS (upper(regexp_replace(translate(name, 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ', 'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'), '[^A-Za-z0-9+]', '', 'g'))) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD COLUMN "normalized_name" text GENERATED ALWAYS AS (upper(regexp_replace(translate(name, 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ', 'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'), '[^A-Za-z0-9+]', '', 'g'))) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "sources" "ad_source"[] DEFAULT '{"leboncoin"}' NOT NULL;--> statement-breakpoint
CREATE INDEX "ads_source_idx" ON "ads" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_normalized_name_key" ON "brands" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "brands_needs_review_idx" ON "brands" USING btree ("needs_review");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_models_brand_id_normalized_name_key" ON "vehicle_models" USING btree ("brand_id","normalized_name");--> statement-breakpoint
CREATE INDEX "vehicle_models_needs_review_idx" ON "vehicle_models" USING btree ("needs_review");--> statement-breakpoint
ALTER TABLE "ads" ADD CONSTRAINT "ads_source_original_ad_id_key" UNIQUE("source","original_ad_id");