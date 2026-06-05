CREATE TABLE "whatsapp_sessions" (
	"id" text PRIMARY KEY DEFAULT 'alertdeals' NOT NULL,
	"credentials" text,
	"is_connected" boolean DEFAULT false NOT NULL,
	"is_disconnected" boolean DEFAULT false NOT NULL,
	"last_connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "deny all access (admin only)" ON "whatsapp_sessions" AS PERMISSIVE FOR ALL TO "authenticated" USING (false) WITH CHECK (false);