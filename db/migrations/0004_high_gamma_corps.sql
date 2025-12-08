ALTER TABLE "sessions" RENAME TO "member_sessions";--> statement-breakpoint
ALTER TABLE "member_sessions" DROP CONSTRAINT "sessions_group_id_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "member_sessions" DROP CONSTRAINT "sessions_member_id_group_members_id_fk";
--> statement-breakpoint
ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_member_id_group_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."group_members"("id") ON DELETE set null ON UPDATE no action;