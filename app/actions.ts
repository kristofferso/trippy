"use server";

import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { comments, groupMembers, groups, posts, reactions, users } from "@/db/schema";
import {
  attachMemberToMemberSession,
  createMemberSession,
  getMemberSession,
  getUserSession,
  createUserSession,
  logoutUser,
  getCurrentMember
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
  const member = await getCurrentMember(groupId);
  if (!member) return null;
  // Wrap in object to maintain compatibility if needed, or refactor callers
  // For now, actions seem to expect just session or similar.
  // Actually, actions usually called getSession() -> session.memberId
  // We will return an object that mimics what's needed: { memberId: member.id }
  // But we should really refactor the callers to use the member object directly.
  return { memberId: member.id, groupId: member.groupId };
}

async function ensureAdmin(groupId: string) {
  const member = await getCurrentMember(groupId);
  if (!member || !member.isAdmin) return null;
  return { member };
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

  const member = await getCurrentMember(group.id);
  if (member) {
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
    
    // Check if user is logged in platform-side to link account
    const userSession = await getUserSession();
    
    const [newMember] = await db
      .insert(groupMembers)
      .values({
        groupId: group.id,
        displayName: parsed.data.displayName,
        email: parsed.data.email || null,
        isAdmin,
        userId: userSession?.userId || null,
      })
      .returning();
    memberId = newMember.id;
  }

  // Only create a guest session if we aren't logged in as a user
  // If we just created a member linked to a user, we don't strictly need a guest session cookie
  // BUT `createMemberSession` sets the cookie which is how `getCurrentMember` finds the member if userId is missing.
  // If `userId` is present, `getCurrentMember` finds it via `userSession`.
  // However, `joinGroupBySlug` is often called by guests.
  // If logged in user joins, they are linked. We don't need member cookie.
  // If guest joins, they need member cookie.
  
  const userSession = await getUserSession();
  if (!userSession && memberId) {
     await createMemberSession(group.id, memberId);
  }

  return { success: true, groupId: group.id };
}

export async function createGroup(
  slug: string,
  name: string,
  password?: string
) {
  const userSession = await getUserSession();
  if (!userSession || !userSession.user) return { error: "Must be logged in to create groups" };

  const existing = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });
  if (existing) return { error: "Slug already taken" };

  const passwordHash = password ? await hashPassword(password) : null;
  const [inserted] = await db
    .insert(groups)
    .values({ slug, name, passwordHash })
    .returning();

  const [member] = await db
    .insert(groupMembers)
    .values({
      groupId: inserted.id,
      displayName: userSession.user.username || userSession.user.email.split("@")[0], // Use username or email prefix
      isAdmin: true,
      userId: userSession.userId,
    })
    .returning();

  // No need to create member session cookie for logged in user creator
  // await createMemberSession(inserted.id, member.id);
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
  
  // If setting display name, it usually means becoming a member (guest or user)
  if (!groupId) return { error: "Group ID required" };

  const userSession = await getUserSession();
  
  // Check if already member
  let member = await getCurrentMember(groupId);
  if (member) {
      // Update existing member? Or just return success?
      // The UI uses this for initial "join/name" gate.
      // If already member, maybe just update name?
      return { success: true, member };
  }

  const memberCount = await db
    .select({ value: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  const isAdmin = (memberCount[0]?.value ?? 0) === 0;

  const [newMember] = await db
    .insert(groupMembers)
    .values({
      groupId: groupId,
      displayName: parsed.data.displayName,
      email: parsed.data.email || null,
      isAdmin,
      userId: userSession?.userId || null,
    })
    .returning();

  if (!userSession) {
      // Create session for guest
      await createMemberSession(groupId, newMember.id);
  } else {
      // Ensure we revalidate so `getCurrentMember` picks it up
      revalidatePath(`/g/${groupId}`); // Assuming we know the slug? We only have ID here.
      // We might need to find the group to revalidate properly or just rely on next refresh
  }
  
  return { success: true, member: newMember };
}

export async function createPost(
  title: string | null,
  body: string | null,
  videoUrl: string | null,
  imageUrls: string[] | null,
  groupId?: string,
  thumbnailUrl?: string | null,
  mediaItems?: { type: 'image' | 'video'; url: string; thumbnailUrl?: string }[]
) {
  // Fallback for backward compatibility if groupId is missing (though we should pass it)
  // If missing, we can't really know which group unless we rely on the cookie, which `getCurrentMember` handles partially via `getMemberSession` fallback
  // But `getMemberSession` needs no args to check cookie? No, `getMemberSession` checks cookie value which is ID.
  // `getCurrentMember` requires groupId to check USER membership.
  // So groupId is mandatory for User Session support.
  
  if (!groupId) {
      // Try to recover from cookie-only session if exists, but this is fragile for multi-group admins
      const session = await getMemberSession();
      if (session?.memberId) {
          groupId = session.groupId;
      } else {
          return { error: "Group context missing" };
      }
  }

  const member = await getCurrentMember(groupId);
  if (!member) {
    return { error: "Not signed in for this group" };
  }

  if (!member.isAdmin) {
    return { error: "Admins only" };
  }

  let media: { type: 'image' | 'video'; url: string; thumbnailUrl?: string }[] = mediaItems || [];
  
  if (media.length === 0) {
    if (videoUrl) {
      media.push({ type: 'video', url: videoUrl, thumbnailUrl: thumbnailUrl || undefined });
    }
    if (imageUrls) {
      imageUrls.forEach((url) => media.push({ type: 'image', url }));
    }
  }

  await db.insert(posts).values({
    groupId: groupId,
    authorId: member.id,
    title,
    body,
    videoUrl,
    imageUrls,
    media,
  });

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });

  if (group) {
      revalidatePath(`/g/${group.slug}`);
  }

  return { success: true };
}

export async function updatePost(
  postId: string,
  title: string | null,
  body: string | null,
  media: { type: 'image' | 'video'; url: string; thumbnailUrl?: string }[]
) {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });
  if (!post) return { error: "Post not found" };

  const admin = await ensureAdmin(post.groupId);
  if (!admin) return { error: "Admins only" };

  // Keep legacy fields in sync roughly
  const videoUrl = media.find(m => m.type === 'video')?.url || null;
  const imageUrls = media.filter(m => m.type === 'image').map(m => m.url);

  await db.update(posts)
    .set({
      title,
      body,
      media,
      videoUrl, 
      imageUrls: imageUrls.length ? imageUrls : null
    })
    .where(eq(posts.id, postId));

  const group = await db.query.groups.findFirst({
      where: eq(groups.id, post.groupId)
  });
  
  if (group) {
      revalidatePath(`/g/${group.slug}`);
      revalidatePath(`/g/${group.slug}/post/${postId}`);
  }
  
  return { success: true };
}

export async function postComment(
  postId: string,
  text: string,
  parentId?: string
) {
  if (!text.trim()) return { error: "Please write a comment" };
  
  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  if (!post) return { error: "Post not found" };

  const member = await getCurrentMember(post.groupId);
  if (!member) return { error: "Need display name", needsProfile: true };

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
    memberId: member.id,
    parentId,
    text,
  });
  return { success: true };
}

export async function addReaction(postId: string, emoji: string) {
  if (!emoji) return { error: "Pick an emoji" };
  
  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  if (!post) return { error: "Post not found" };

  const member = await getCurrentMember(post.groupId);
  if (!member) return { error: "Need display name", needsProfile: true };

  await db.insert(reactions).values({
    postId,
    memberId: member.id,
    emoji,
  });

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, post.groupId),
  });
  
  if (group) {
    revalidatePath(`/g/${group.slug}/post/${postId}`);
    revalidatePath(`/g/${group.slug}`);
  }

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
  // Allow anyone to see members? Or just members?
  // Previously it checked for session.
  const member = await getCurrentMember(groupId);
  if (!member) return [];

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

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerAction(formData: FormData) {
  const data = Object.fromEntries(formData);
  const parsed = authSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }
  
  const { email, password } = parsed.data;
  
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  
  if (existing) return { error: "Email already registered" };
  
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email, passwordHash }).returning();
  
  await createUserSession(user.id);
  return { success: true };
}

export async function loginAction(formData: FormData) {
  const data = Object.fromEntries(formData);
  // We can loosen validation for login if we want, but email format check is good
  const parsed = authSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid email or password" };
  }

  const { email, password } = parsed.data;
  
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  
  if (!user) return { error: "Invalid credentials" };
  
  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) return { error: "Invalid credentials" };
  
  await createUserSession(user.id);
  return { success: true };
}

export async function logoutAction() {
  await logoutUser();
  redirect("/login");
}

export async function updateUsernameAction(formData: FormData) {
  const username = formData.get("username") as string;
  
  if (!username || username.length < 2) {
    return { error: "Username must be at least 2 characters" };
  }

  const session = await getUserSession();
  if (!session) return { error: "Not logged in" };

  try {
    await db.update(users)
      .set({ username })
      .where(eq(users.id, session.userId));
    
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: "Username already taken" };
  }
}
