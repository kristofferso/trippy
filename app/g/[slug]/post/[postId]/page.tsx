import { notFound } from "next/navigation";
import { desc, count, eq } from "drizzle-orm";

import { PasswordGate } from "@/components/password-gate";
import { NameDialog } from "@/components/name-dialog";
import { ReactionBar } from "@/components/reaction-bar";
import { CommentForm } from "@/components/comment-form";
import { CommentList, type CommentWithAuthor } from "@/components/comment-list";
import { db } from "@/db";
import { comments, groupMembers, groups, posts, reactions } from "@/db/schema";
import { createSession, getSession } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const slug = (await params).slug;
  const postId = (await params).postId;
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });
  if (!group) notFound();

  let session = await getSession(group.id);
  // if (!session && !group.passwordHash) {
  //   session = await createSession(group.id, null);
  // }
  if (group.passwordHash && !session) {
    return <PasswordGate slug={group.slug} name={group.name} />;
  }

  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  if (!post || post.groupId !== group.id) notFound();

  const member = session?.memberId
    ? await db.query.groupMembers.findFirst({
        where: eq(groupMembers.id, session.memberId),
      })
    : null;
  const isAdmin = !!member?.isAdmin;

  const reactionRows = await db
    .select({ emoji: reactions.emoji, count: count() })
    .from(reactions)
    .where(eq(reactions.postId, post.id))
    .groupBy(reactions.emoji);
  const reactionCounts: Record<string, number> = {};
  for (const row of reactionRows) {
    reactionCounts[row.emoji] = Number(row.count);
  }

  const commentRows = await db
    .select({
      id: comments.id,
      text: comments.text,
      createdAt: comments.createdAt,
      memberId: comments.memberId,
      parentId: comments.parentId,
      displayName: groupMembers.displayName,
    })
    .from(comments)
    .innerJoin(groupMembers, eq(comments.memberId, groupMembers.id))
    .where(eq(comments.postId, post.id))
    .orderBy(desc(comments.createdAt));
  const commentsWithAuthors: CommentWithAuthor[] = commentRows.map(
    (comment) => ({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      parentId: comment.parentId,
      member: {
        id: comment.memberId,
        displayName: comment.displayName,
      },
    })
  );

  return (
    <>
      <header className="mb-8 space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            {post.title || "Untitled Post"}
          </h1>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-900">{group.name}</span>
            <span>•</span>
            <time dateTime={new Date(post.createdAt).toISOString()}>
              {formatDate(post.createdAt)}
            </time>
          </div>
        </div>
      </header>

      <main className="space-y-8">
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <div className="flex-1 space-y-8">
            {post.body && (
              <div className="prose prose-slate max-w-none text-lg text-slate-700">
                <p>{post.body}</p>
              </div>
            )}

            {post.videoUrl && (
              <div className="overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-slate-900/10">
                <video
                  src={post.videoUrl}
                  controls
                  className="aspect-9/16 w-full"
                  poster={post.videoUrl + "#t=0.1"}
                />
              </div>
            )}

            <div className="w-full py-2">
              <ReactionBar postId={post.id} counts={reactionCounts} />
            </div>
          </div>

          <div className="w-full space-y-8 border-t pt-8 md:w-[350px] md:border-t-0 md:pt-0">
            <div className="sticky top-8 space-y-6">
              <div>
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Comments ({commentsWithAuthors.length})
                </h2>
                <CommentForm postId={post.id} />
              </div>
              <CommentList
                comments={commentsWithAuthors}
                isAdmin={isAdmin}
                postId={post.id}
              />
            </div>
          </div>
        </div>
      </main>
      <NameDialog groupId={group.id} />
    </>
  );
}
