"use server";

import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { comments, groupMembers, groups, posts, reactions } from "@/db/schema";
import {
  attachMemberToSession,
  createSession,
  getSession,
} from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";

const displayNameSchema = z.object({
  displayName: z.string().min(2, "Please enter a name"),
  email: z.string().email().optional().or(z.literal("")), // allow empty string
});

async function getMember(memberId: string) {
  return db.query.groupMembers.findFirst({
    where: eq(groupMembers.id, memberId),
  });
}

async function ensureSessionForGroup(groupId: string) {
  const session = await getSession(groupId);
  if (!session) return null;
  return session;
}

async function ensureAdmin(groupId: string) {
  const session = await ensureSessionForGroup(groupId);
  if (!session?.memberId) return null;
  const member = await getMember(session.memberId);
  if (!member || !member.isAdmin) return null;
  return { session, member };
}

export async function joinGroupBySlug(
  slug: string,
  password?: string,
  displayName?: string,
  email?: string
) {
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });
  if (!group) {
    return { error: "Group not found" };
  }

  const existingSession = await getSession(group.id);
  if (existingSession) {
    return { success: true, groupId: group.id };
  }

  if (group.passwordHash) {
    if (!password) return { error: "Password required" };
    const ok = await verifyPassword(group.passwordHash, password);
    if (!ok) return { error: "Invalid password" };
  }

  let memberId: string | null = null;
  if (displayName) {
    const parsed = displayNameSchema.safeParse({ displayName, email });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }
    const memberCount = await db
      .select({ value: count() })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, group.id));
    const isAdmin = (memberCount[0]?.value ?? 0) === 0;
    const [member] = await db
      .insert(groupMembers)
      .values({
        groupId: group.id,
        displayName: parsed.data.displayName,
        email: parsed.data.email || null,
        isAdmin,
      })
      .returning();
    memberId = member.id;
  }

  await createSession(group.id, memberId);
  return { success: true, groupId: group.id };
}

export async function createGroup(
  slug: string,
  name: string,
  displayName: string,
  password?: string
) {
  const existing = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });
  if (existing) return { error: "Slug already taken" };

  const parsed = displayNameSchema.safeParse({ displayName });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid name" };
  }

  const passwordHash = password ? await hashPassword(password) : null;
  const [inserted] = await db
    .insert(groups)
    .values({ slug, name, passwordHash })
    .returning();

  const [member] = await db
    .insert(groupMembers)
    .values({
      groupId: inserted.id,
      displayName: parsed.data.displayName,
      isAdmin: true,
    })
    .returning();

  await createSession(inserted.id, member.id);
  return { success: true, groupId: inserted.id };
}

export async function setDisplayName(
  displayName: string,
  email?: string,
  groupId?: string
) {
  const parsed = displayNameSchema.safeParse({ displayName, email });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  let session = await getSession();
  if (!session) {
    if (!groupId) return { error: "No active session" };
    session = await createSession(groupId, null);
  }

  const memberCount = await db
    .select({ value: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, session.groupId));
  const isAdmin = (memberCount[0]?.value ?? 0) === 0;
  const [member] = await db
    .insert(groupMembers)
    .values({
      groupId: session.groupId,
      displayName: parsed.data.displayName,
      email: parsed.data.email || null,
      isAdmin,
    })
    .returning();

  await attachMemberToSession(session.id, member.id);
  return { success: true, member };
}

export async function postComment(
  postId: string,
  text: string,
  parentId?: string
) {
  if (!text.trim()) return { error: "Please write a comment" };
  const session = await getSession();
  if (!session) return { error: "No session", needsProfile: true };
  if (!session.memberId)
    return { error: "Need display name", needsProfile: true };
  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  if (!post || post.groupId !== session.groupId)
    return { error: "Post not found in this group" };

  if (parentId) {
    const parentComment = await db.query.comments.findFirst({
      where: eq(comments.id, parentId),
    });
    if (!parentComment) return { error: "Parent comment not found" };
    if (parentComment.parentId) {
      return { error: "Replies are limited to 2 levels" };
    }
  }

  await db.insert(comments).values({
    postId,
    memberId: session.memberId,
    parentId,
    text,
  });
  return { success: true };
}

export async function addReaction(postId: string, emoji: string) {
  if (!emoji) return { error: "Pick an emoji" };
  const session = await getSession();
  if (!session) return { error: "No session", needsProfile: true };
  if (!session.memberId)
    return { error: "Need display name", needsProfile: true };
  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  if (!post || post.groupId !== session.groupId)
    return { error: "Post not found in this group" };

  await db.insert(reactions).values({
    postId,
    memberId: session.memberId,
    emoji,
  });
  return { success: true };
}

export async function deleteComment(commentId: string) {
  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, commentId),
  });
  if (!comment) return { error: "Comment missing" };
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, comment.postId),
  });
  if (!post) return { error: "Post missing" };
  const admin = await ensureAdmin(post.groupId);
  if (!admin) return { error: "Admins only" };
  await db.delete(comments).where(eq(comments.id, commentId));
  return { success: true };
}

export async function deletePost(postId: string) {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });
  if (!post) return { error: "Post missing" };
  const admin = await ensureAdmin(post.groupId);
  if (!admin) return { error: "Admins only" };
  await db.delete(posts).where(eq(posts.id, postId));
  return { success: true };
}

export async function deleteMember(memberId: string) {
  const member = await getMember(memberId);
  if (!member) return { error: "Member missing" };
  const admin = await ensureAdmin(member.groupId);
  if (!admin) return { error: "Admins only" };
  if (admin.member.id === memberId) return { error: "Cannot remove yourself" };
  await db.delete(groupMembers).where(eq(groupMembers.id, memberId));
  return { success: true };
}

export async function getGroupMembers(groupId: string) {
  const session = await getSession(groupId);
  if (!session) return [];

  return db
    .select({
      id: groupMembers.id,
      displayName: groupMembers.displayName,
      isAdmin: groupMembers.isAdmin,
    })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(desc(groupMembers.createdAt));
}
