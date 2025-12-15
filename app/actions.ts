"use server";

import { count, desc, eq, and, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  comments,
  groupMembers,
  groups,
  memberSessions,
  posts,
  reactions,
  postViews,
  users,
} from "@/db/schema";
import {
  attachMemberToMemberSession,
  createMemberSession,
  getMemberSession,
  getUserSession,
  createUserSession,
  logoutUser,
  getCurrentMember,
} from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";

const displayNameSchema = z.object({
  displayName: z.string().min(2, "Please enter a name"),
  email: z.string().email().optional().or(z.literal("")), // allow empty string
});

async function findUnlinkedMember(
  groupId: string,
  displayName: string,
  email?: string | null
) {
  const nameMatch = sql`lower(${groupMembers.displayName}) = lower(${displayName})`;
  const emailMatch = email
    ? sql`lower(${groupMembers.email}) = lower(${email})`
    : undefined;

  const matchCondition = emailMatch ? or(nameMatch, emailMatch) : nameMatch;

  return db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      isNull(groupMembers.userId),
      matchCondition
    ),
  });
}

async function getMember(memberId: string) {
  return db.query.groupMembers.findFirst({
    where: eq(groupMembers.id, memberId),
  });
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

    // Check for existing unlinked member to inhabit
    const existingMember = await findUnlinkedMember(
      group.id,
      parsed.data.displayName,
      parsed.data.email
    );

    if (existingMember) {
      memberId = existingMember.id;
      // Link if logged in
      if (userSession?.userId) {
        await db
          .update(groupMembers)
          .set({ userId: userSession.userId })
          .where(eq(groupMembers.id, memberId));
      }
      // Update email if provided and missing
      if (parsed.data.email && !existingMember.email) {
        await db
          .update(groupMembers)
          .set({ email: parsed.data.email })
          .where(eq(groupMembers.id, memberId));
      }
    } else {
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
  if (!userSession || !userSession.user)
    return { error: "Must be logged in to create groups" };

  const existing = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });
  if (existing) return { error: "Slug already taken" };

  const passwordHash = password ? await hashPassword(password) : null;

  return await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(groups)
      .values({ slug, name, passwordHash })
      .returning();

    await tx.insert(groupMembers).values({
      groupId: inserted.id,
      displayName:
        userSession.user.username || userSession.user.email.split("@")[0], // Use username or email prefix
      isAdmin: true,
      userId: userSession.userId,
    });

  return { success: true, groupId: inserted.id };
  });
}

export async function markPostSeen(postId: string) {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    columns: {
      groupId: true,
    },
  });
  if (!post) return;

  const member = await getCurrentMember(post.groupId);
  if (!member) return;

  await db
    .insert(postViews)
    .values({ postId, memberId: member.id })
    .onConflictDoNothing();
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

  // Check for existing unlinked member to inhabit
  const existingMember = await findUnlinkedMember(
    groupId,
    parsed.data.displayName,
    parsed.data.email
  );

  let newMember;

  if (existingMember) {
    newMember = existingMember;
    // Link if logged in
    if (userSession?.userId) {
      await db
        .update(groupMembers)
        .set({ userId: userSession.userId })
        .where(eq(groupMembers.id, newMember.id));
    }
    // Update email if provided and missing
    if (parsed.data.email && !existingMember.email) {
      await db
        .update(groupMembers)
        .set({ email: parsed.data.email })
        .where(eq(groupMembers.id, newMember.id));
      // Update local object to return correct data
      newMember.email = parsed.data.email;
    }
  } else {
    const [inserted] = await db
      .insert(groupMembers)
      .values({
        groupId: groupId,
        displayName: parsed.data.displayName,
        email: parsed.data.email || null,
        isAdmin,
        userId: userSession?.userId || null,
      })
      .returning();
    newMember = inserted;
  }

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
  mediaItems?: { type: "image" | "video"; url: string; thumbnailUrl?: string }[]
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

  // Validate URLs
  if (videoUrl) {
    const parsed = z.string().url().safeParse(videoUrl);
    if (!parsed.success) return { error: "Invalid video URL" };
  }
  if (imageUrls) {
    const parsed = z.array(z.string().url()).safeParse(imageUrls);
    if (!parsed.success) return { error: "Invalid image URLs" };
  }
  if (mediaItems) {
    const parsed = z
      .array(
        z.object({
          type: z.enum(["image", "video"]),
          url: z.string().url(),
          thumbnailUrl: z.string().url().optional(),
        })
      )
      .safeParse(mediaItems);
    if (!parsed.success) return { error: "Invalid media items" };
  }

  let media: { type: "image" | "video"; url: string; thumbnailUrl?: string }[] =
    mediaItems || [];

  if (media.length === 0) {
    if (videoUrl) {
      media.push({
        type: "video",
        url: videoUrl,
        thumbnailUrl: thumbnailUrl || undefined,
      });
    }
    if (imageUrls) {
      imageUrls.forEach((url) => media.push({ type: "image", url }));
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
  media: { type: "image" | "video"; url: string; thumbnailUrl?: string }[]
) {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });
  if (!post) return { error: "Post not found" };

  const admin = await ensureAdmin(post.groupId);
  if (!admin) return { error: "Admins only" };

  // Validate URLs
  const parsed = z
    .array(
      z.object({
        type: z.enum(["image", "video"]),
        url: z.string().url(),
        thumbnailUrl: z.string().url().optional(),
      })
    )
    .safeParse(media);
  if (!parsed.success) return { error: "Invalid media items" };

  // Keep legacy fields in sync roughly
  const videoUrl = media.find((m) => m.type === "video")?.url || null;
  const imageUrls = media.filter((m) => m.type === "image").map((m) => m.url);

  await db
    .update(posts)
    .set({
      title,
      body,
      media,
      videoUrl,
      imageUrls: imageUrls.length ? imageUrls : null,
    })
    .where(eq(posts.id, postId));

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, post.groupId),
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

  const existing = await db.query.reactions.findFirst({
    where: and(
      eq(reactions.postId, postId),
      eq(reactions.memberId, member.id),
      eq(reactions.emoji, emoji)
    ),
  });

  if (existing) {
    await db.delete(reactions).where(eq(reactions.id, existing.id));
  } else {
    await db.insert(reactions).values({
      postId,
      memberId: member.id,
      emoji,
    });
  }

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, post.groupId),
  });

  if (group) {
    revalidatePath(`/g/${group.slug}/post/${postId}`);
    revalidatePath(`/g/${group.slug}`);
  }

  return { success: true, action: existing ? "removed" : "added" };
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

  await db.delete(memberSessions).where(eq(memberSessions.memberId, memberId));
  await db.delete(groupMembers).where(eq(groupMembers.id, memberId));
  return { success: true };
}

export async function toggleAdmin(memberId: string) {
  const member = await getMember(memberId);
  if (!member) return { error: "Member missing" };

  const admin = await ensureAdmin(member.groupId);
  if (!admin) return { error: "Admins only" };

  if (admin.member.id === memberId)
    return { error: "Cannot change your own role" };

  if (!member.userId) {
    return { error: "Only registered users can be admins" };
  }

  await db
    .update(groupMembers)
    .set({ isAdmin: !member.isAdmin })
    .where(eq(groupMembers.id, memberId));

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, member.groupId),
  });

  if (group) {
    revalidatePath(`/g/${group.slug}`);
  }

  return { success: true, isAdmin: !member.isAdmin };
}

export async function getGroupMembers(groupId: string) {
  // Allow anyone to see members? Or just members?
  // Previously it checked for session.
  const currentMember = await getCurrentMember(groupId);
  if (!currentMember) return [];

  const members = await db
    .select({
      id: groupMembers.id,
      displayName: groupMembers.displayName,
      isAdmin: groupMembers.isAdmin,
      userId: groupMembers.userId,
    })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(desc(groupMembers.createdAt));

  return members.map((m) => ({
    ...m,
    isCurrentUser: m.id === currentMember.id,
    isUser: !!m.userId,
  }));
}

export async function getReactionDetails(postId: string, emoji: string | null) {
  const filters = [eq(reactions.postId, postId)];
  if (emoji) {
    filters.push(eq(reactions.emoji, emoji));
  }

  const reactionList = await db
    .select({
      id: reactions.id,
      displayName: groupMembers.displayName,
      createdAt: reactions.createdAt,
      emoji: reactions.emoji,
    })
    .from(reactions)
    .innerJoin(groupMembers, eq(reactions.memberId, groupMembers.id))
    .where(and(...filters))
    .orderBy(desc(reactions.createdAt));

  return reactionList;
}

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

async function linkGuestMemberships(userId: string, email: string) {
  await db
    .update(groupMembers)
    .set({ userId })
    .where(and(eq(groupMembers.email, email), isNull(groupMembers.userId)));
}

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
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning();

  await createUserSession(user.id);
  await linkGuestMemberships(user.id, email);
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
  await linkGuestMemberships(user.id, email);
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
    await db
      .update(users)
      .set({ username })
      .where(eq(users.id, session.userId));

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (error) {
    return { error: "Username already taken" };
  }
}

export async function updatePasswordAction(formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All fields are required" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match" };
  }

  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const session = await getUserSession();
  if (!session) return { error: "Not logged in" };

  // Verify current password
  const valid = await verifyPassword(
    session.user.passwordHash,
    currentPassword
  );
  if (!valid) return { error: "Incorrect current password" };

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, session.userId));

  return { success: true };
}

export async function updateUserAvatarAction(avatarUrl: string | null) {
  const session = await getUserSession();
  if (!session) return { error: "Not logged in" };

  await db
    .update(users)
    .set({ avatarUrl })
    .where(eq(users.id, session.userId));

  revalidatePath("/dashboard/profile");
  return { success: true };
}

export async function updateGroup(
  groupId: string,
  name: string,
  slug: string,
  enablePassword: boolean,
  password?: string
) {
  const admin = await ensureAdmin(groupId);
  if (!admin) return { error: "Admins only" };

  const existing = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });

  if (existing && existing.id !== groupId) {
    return { error: "Slug already taken" };
  }

  const updateData: any = { name, slug };

  if (!enablePassword) {
    updateData.passwordHash = null;
  } else if (password) {
    updateData.passwordHash = await hashPassword(password);
  } else {
    const currentGroup = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });

    if (currentGroup && !currentGroup.passwordHash) {
      return { error: "Password required to enable protection" };
    }
  }

  await db.update(groups).set(updateData).where(eq(groups.id, groupId));

  revalidatePath(`/g/${slug}`);
  return { success: true };
}

export async function revokeMemberSession(memberId: string) {
  const member = await getMember(memberId);
  if (!member) return { error: "Member missing" };

  const admin = await ensureAdmin(member.groupId);
  if (!admin) return { error: "Admins only" };

  await db.delete(memberSessions).where(eq(memberSessions.memberId, memberId));
  return { success: true };
}
