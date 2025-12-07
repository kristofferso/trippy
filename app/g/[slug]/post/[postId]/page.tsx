import { notFound } from 'next/navigation';
import { asc, count, eq } from 'drizzle-orm';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordGate } from '@/components/password-gate';
import { NameDialog } from '@/components/name-dialog';
import { ReactionBar } from '@/components/reaction-bar';
import { CommentForm } from '@/components/comment-form';
import { CommentList, type CommentWithAuthor } from '@/components/comment-list';
import { db } from '@/db';
import { comments, groupMembers, groups, posts, reactions } from '@/db/schema';
import { createSession, getSession } from '@/lib/session';
import { formatDate } from '@/lib/utils';

export default async function PostPage({ params }: { params: { slug: string; postId: string } }) {
  const group = await db.query.groups.findFirst({ where: eq(groups.slug, params.slug) });
  if (!group) notFound();

  let session = await getSession(group.id);
  if (!session && !group.passwordHash) {
    session = await createSession(group.id, null);
  }
  if (group.passwordHash && !session) {
    return <PasswordGate slug={group.slug} name={group.name} />;
  }

  const post = await db.query.posts.findFirst({ where: eq(posts.id, params.postId) });
  if (!post || post.groupId !== group.id) notFound();

  const member = session?.memberId
    ? await db.query.groupMembers.findFirst({ where: eq(groupMembers.id, session.memberId) })
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
      displayName: groupMembers.displayName,
    })
    .from(comments)
    .innerJoin(groupMembers, eq(comments.memberId, groupMembers.id))
    .where(eq(comments.postId, post.id))
    .orderBy(asc(comments.createdAt));
  const commentsWithAuthors: CommentWithAuthor[] = commentRows.map((comment) => ({
    id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt,
    member: {
      id: comment.memberId,
      displayName: comment.displayName,
    },
  }));

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-1 bg-gradient-to-r from-slate-100 to-white">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">{group.name}</p>
          {post.title ? <CardTitle className="text-3xl">{post.title}</CardTitle> : null}
          <CardDescription>{formatDate(post.createdAt)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {post.body ? <p className="text-lg leading-relaxed">{post.body}</p> : null}
          {post.videoUrl && (
            <div className="overflow-hidden rounded-lg border shadow-sm">
              <video src={post.videoUrl} controls className="aspect-video w-full" />
            </div>
          )}
          <ReactionBar postId={post.id} counts={reactionCounts} />
        </CardContent>
      </Card>

      <Card className="animate-in fade-in slide-in-from-bottom-4">
        <CardHeader>
          <CardTitle>Comments</CardTitle>
          <CardDescription>Share your thoughts with the group.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CommentForm postId={post.id} />
          <CommentList comments={commentsWithAuthors} isAdmin={isAdmin} />
        </CardContent>
      </Card>
      <NameDialog />
    </div>
  );
}
