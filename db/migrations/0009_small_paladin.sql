CREATE TABLE "post_views" (
	"post_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_views_post_id_member_id_pk" PRIMARY KEY("post_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_member_id_group_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."group_members"("id") ON DELETE cascade ON UPDATE no action;