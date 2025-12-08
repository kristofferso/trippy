import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, posts } from "@/db/schema";
import { getCurrentMember } from "@/lib/session";
import { PostForm } from "@/components/post-form";

export default async function EditPostPage({ params }: { params: Promise<{ slug: string; postId: string }> }) {
  const { slug, postId } = await params;
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });
  if (!group) notFound();

  const member = await getCurrentMember(group.id);
  if (!member || !member.isAdmin) {
      redirect(`/g/${slug}`);
  }

  const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId)
  });
  if (!post || post.groupId !== group.id) notFound();

  // Normalize media for initialData
  let media = post.media || [];
  if (media.length === 0) {
      if (post.videoUrl) media.push({ type: 'video', url: post.videoUrl });
      if (post.imageUrls) media.push(...post.imageUrls.map(url => ({ type: 'image' as const, url })));
  }

  return (
    <div className="min-h-screen bg-white">
      <PostForm groupId={group.id} groupSlug={group.slug} initialData={{ ...post, media }} />
    </div>
  );
}

