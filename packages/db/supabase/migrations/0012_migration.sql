CREATE TABLE "whatsapp_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"group_id" varchar(128) NOT NULL,
	"group_name" varchar(255),
	"added_by" varchar(64),
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_group_account_id_group_id_key" UNIQUE("account_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "whatsapp_groups" ADD CONSTRAINT "whatsapp_group_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "whatsapp_group_account_id_idx" ON "whatsapp_groups" USING btree ("account_id");--> statement-breakpoint
CREATE POLICY "enable read and delete for the group owners" ON "whatsapp_groups" AS PERMISSIVE FOR ALL TO "authenticated" USING ("whatsapp_groups"."account_id" = (select auth.uid())) WITH CHECK ("whatsapp_groups"."account_id" = (select auth.uid()));