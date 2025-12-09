import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { groupMembers, memberSessions, userSessions } from "@/db/schema";

const MEMBER_SESSION_COOKIE = "member_session_id";
const USER_SESSION_COOKIE = "user_session_id";

export type MemberSession = {
  id: string;
  groupId: string;
  memberId: string | null;
};

async function setMemberSessionCookie(id: string) {
  const store = await cookies();
  store.set(MEMBER_SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function getMemberSession(groupId?: string) {
  const store = await cookies();
  const sessionId = store.get(MEMBER_SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const existing = await db.query.memberSessions.findFirst({
    where: eq(memberSessions.id, sessionId),
  });

  if (!existing) return null;
  if (groupId && existing.groupId !== groupId) return null;
  return existing;
}

export async function createMemberSession(
  groupId: string,
  memberId?: string | null
) {
  const id = randomBytes(32).toString("hex");
  await db
    .insert(memberSessions)
    .values({ id, groupId, memberId: memberId ?? null });
  await setMemberSessionCookie(id);
  // Return the complete object matching the schema
  return {
    id,
    groupId,
    memberId: memberId ?? null,
    createdAt: new Date(),
    expiresAt: null,
  };
}

export async function attachMemberToMemberSession(
  sessionId: string,
  memberId: string
) {
  await db
    .update(memberSessions)
    .set({ memberId })
    .where(eq(memberSessions.id, sessionId));
  await setMemberSessionCookie(sessionId);
}

export async function getUserSession() {
  const store = await cookies();
  const sessionId = store.get(USER_SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await db.query.userSessions.findFirst({
    where: eq(userSessions.id, sessionId),
    with: { user: true },
  });

  if (!session) return null;
  return session;
}

export async function createUserSession(userId: string) {
  const id = randomBytes(32).toString("hex");
  await db.insert(userSessions).values({ id, userId });

  const store = await cookies();
  store.set(USER_SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return id;
}

export async function logoutUser() {
  const store = await cookies();
  store.delete(USER_SESSION_COOKIE);
}

export async function getCurrentMember(groupId: string) {
  // 1. Check for user session first
  const userSession = await getUserSession();
  if (userSession?.user) {
    const member = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.userId, userSession.userId),
        eq(groupMembers.groupId, groupId)
      ),
    });
    if (member) return member;
  }

  // 2. Fallback to guest session
  const session = await getMemberSession(groupId);
  if (session?.memberId) {
    const member = await db.query.groupMembers.findFirst({
      where: eq(groupMembers.id, session.memberId),
    });
    if (member) return member;
  }

  return null;
}
