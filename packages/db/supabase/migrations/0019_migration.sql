CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscription_account_id_endpoint_key" UNIQUE("account_id","endpoint")
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscription_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_subscription_account_id_idx" ON "push_subscriptions" USING btree ("account_id");--> statement-breakpoint
CREATE POLICY "enable all for the subscription owners" ON "push_subscriptions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("push_subscriptions"."account_id" = (select auth.uid())) WITH CHECK ("push_subscriptions"."account_id" = (select auth.uid()));