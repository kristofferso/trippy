import { notFound } from 'next/navigation';
import { count, desc, eq, inArray } from 'drizzle-orm';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PasswordGate } from '@/components/password-gate';
import { NameDialog } from '@/components/name-dialog';
import { NewPostDialog } from '@/components/new-post-dialog';
import { deleteMember } from '@/app/actions';
import { db } from '@/db';
import { comments, groupMembers, groups, posts, reactions } from '@/db/schema';
import { createSession, getSession } from '@/lib/session';
import { formatDate } from '@/lib/utils';

export default async function GroupFeedPage({ params }: { params: { slug: string } }) {
  const group = await db.query.groups.findFirst({ where: eq(groups.slug, params.slug) });
  if (!group) notFound();

  let session = await getSession(group.id);
  if (!session && !group.passwordHash) {
    session = await createSession(group.id, null);
  }

  if (group.passwordHash && !session) {
    return <PasswordGate slug={group.slug} name={group.name} />;
  }

  const member = session?.memberId
    ? await db.query.groupMembers.findFirst({ where: eq(groupMembers.id, session.memberId) })
    : null;
  const isAdmin = !!member?.isAdmin;

  const postList = await db.query.posts.findMany({
    where: eq(posts.groupId, group.id),
    orderBy: desc(posts.createdAt),
  });
  const postIds = postList.map((p) => p.id);

  const reactionRows = postIds.length
    ? await db
        .select({ postId: reactions.postId, emoji: reactions.emoji, value: count() })
        .from(reactions)
        .where(inArray(reactions.postId, postIds))
        .groupBy(reactions.postId, reactions.emoji)
    : [];
  const reactionCounts: Record<string, Record<string, number>> = {};
  for (const row of reactionRows) {
    reactionCounts[row.postId] = reactionCounts[row.postId] ?? {};
    reactionCounts[row.postId][row.emoji] = Number(row.value);
  }

  const commentRows = postIds.length
    ? await db
        .select({ postId: comments.postId, value: count() })
        .from(comments)
        .where(inArray(comments.postId, postIds))
        .groupBy(comments.postId)
    : [];
  const commentCounts: Record<string, number> = {};
  for (const row of commentRows) {
    commentCounts[row.postId] = Number(row.value);
  }

  const members = await db
    .select({ id: groupMembers.id, displayName: groupMembers.displayName, isAdmin: groupMembers.isAdmin })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, group.id))
    .orderBy(desc(groupMembers.createdAt));

  async function removeMember(memberId: string) {
    'use server';
    await deleteMember(memberId);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Group</p>
          <h1 className="text-3xl font-bold">{group.name}</h1>
          <p className="text-muted-foreground">/{group.slug}</p>
        </div>
        {isAdmin ? <NewPostDialog /> : null}
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Feed</CardTitle>
            <CardDescription>Latest posts from admins in this group.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {postList.length === 0 ? <p className="text-sm text-muted-foreground">No posts yet.</p> : null}
            {postList.map((post) => (
              <Card key={post.id} className="border bg-white/80 shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {post.title ? <CardTitle className="text-xl">{post.title}</CardTitle> : null}
                      {post.body ? (
                        <CardDescription className="line-clamp-2 text-base text-muted-foreground">
                          {post.body}
                        </CardDescription>
                      ) : null}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatDate(post.createdAt)}</p>
                      {post.videoUrl ? <p className="text-primary">Video attached</p> : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex gap-3">
                    {Object.entries(reactionCounts[post.id] ?? {}).map(([emoji, value]) => (
                      <span key={emoji} className="flex items-center gap-1 text-base">
                        <span>{emoji}</span>
                        <span>{value}</span>
                      </span>
                    ))}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={`/g/${group.slug}/post/${post.id}`}>Open</a>
                  </Button>
                  <p className="text-xs text-muted-foreground">{commentCounts[post.id] ?? 0} comments</p>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>Admins can remove members if needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border p-2 text-muted-foreground"
              >
                <div>
                  <p className="font-medium text-foreground">{member.displayName}</p>
                  {member.isAdmin ? <p className="text-xs text-primary">Admin</p> : null}
                </div>
                {isAdmin && member.id !== session?.memberId ? (
                  <form action={removeMember.bind(null, member.id)}>
                    <Button type="submit" variant="destructive" size="sm">
                      Remove
                    </Button>
                  </form>
                ) : null}
              </div>
            ))}
            {members.length === 0 ? (
              <p className="text-muted-foreground">No members registered yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
      <NameDialog />
    </div>
  );
}
