import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { memberSessions, userSessions } from "@/db/schema";

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
    path: "/",
  });

  return id;
}

export async function logoutUser() {
  const store = await cookies();
  store.delete(USER_SESSION_COOKIE);
}
