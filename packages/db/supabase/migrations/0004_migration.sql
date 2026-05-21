ALTER TABLE "accounts" ADD COLUMN "whatsapp_phone_number" varchar(64);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "whatsapp_is_group" boolean DEFAULT false NOT NULL;