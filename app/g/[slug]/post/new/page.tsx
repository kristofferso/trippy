import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { getCurrentMember } from "@/lib/session";
import { PostFormSheet } from "@/components/post-form-sheet";

export default async function NewPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });
  if (!group) notFound();

  const member = await getCurrentMember(group.id);
  if (!member || !member.isAdmin) {
      redirect(`/g/${slug}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <PostFormSheet groupId={group.id} groupSlug={group.slug} />
    </div>
  );
}

