import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comments, groupMembers, reactions } from "@/db/schema";
import { PostInteractionLayer } from "@/components/post-interaction-layer";

export async function PostInteractionsLoader({
  postId,
  post,
  isAdmin,
}: {
  postId: string;
  post: any;
  isAdmin: boolean;
}) {
  // Fetch reactions
  const reactionRows = await db
    .select({ emoji: reactions.emoji, count: count() })
    .from(reactions)
    .where(eq(reactions.postId, postId))
    .groupBy(reactions.emoji);
  const reactionCounts: Record<string, number> = {};
  for (const row of reactionRows) {
    reactionCounts[row.emoji] = Number(row.count);
  }

  // Fetch comments
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
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt));

  const commentsWithAuthors = commentRows.map((comment) => ({
    id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt,
    parentId: comment.parentId,
    member: {
      id: comment.memberId,
      displayName: comment.displayName,
    },
  }));

  return (
    <PostInteractionLayer
      postId={postId}
      post={post}
      counts={reactionCounts}
      comments={commentsWithAuthors}
      isAdmin={isAdmin}
    />
  );
}

