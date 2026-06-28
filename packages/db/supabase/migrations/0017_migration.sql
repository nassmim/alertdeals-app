CREATE TYPE "public"."admin_role" AS ENUM('admin', 'super_admin');--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "confirmed_by_admin" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "admin_role" "admin_role";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "is_admin";