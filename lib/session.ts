import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { sessions } from '@/db/schema';

const SESSION_COOKIE = 'session_id';

function getCookieStore() {
  // We wrap cookies() so server actions can call these helpers easily.
  return cookies();
}

function setSessionCookie(id: string) {
  const store = getCookieStore();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession(groupId?: string) {
  const store = getCookieStore();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const existing = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!existing) return null;
  if (groupId && existing.groupId !== groupId) return null;
  return existing;
}

export async function createSession(groupId: string, memberId?: string | null) {
  const id = randomBytes(32).toString('hex');
  await db.insert(sessions).values({ id, groupId, memberId: memberId ?? null });
  setSessionCookie(id);
  return { id, groupId, memberId: memberId ?? null };
}

export async function attachMemberToSession(sessionId: string, memberId: string) {
  await db
    .update(sessions)
    .set({ memberId })
    .where(eq(sessions.id, sessionId));
  setSessionCookie(sessionId);
}
