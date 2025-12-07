import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { groupMembers } from "@/db/schema";

async function uploadVideoToStorage(file: File) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN environment variable.");
  }

  const sanitizedName = file.name.replace(/\s+/g, "-");
  const objectKey = `uploads/${Date.now()}-${sanitizedName}`;

  const blob = await put(objectKey, file, {
    access: "public",
    token,
  });

  return blob.url;
}

async function getMember(memberId: string) {
  return db.query.groupMembers.findFirst({
    where: eq(groupMembers.id, memberId),
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const title = formData.get("title")?.toString() || null;
    const body = formData.get("body")?.toString() || null;
    const maybeFile = formData.get("video");

    const session = await getSession();
    if (!session?.memberId) {
      return NextResponse.json(
        { error: "Not signed in for this group" },
        { status: 401 }
      );
    }

    const member = await getMember(session.memberId);
    if (!member || !member.isAdmin) {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    let videoUrl: string | null = null;
    if (maybeFile instanceof File && maybeFile.size > 0) {
      try {
        videoUrl = await uploadVideoToStorage(maybeFile);
      } catch (error) {
        console.error(error);
        return NextResponse.json(
          { error: "Failed to upload video" },
          { status: 500 }
        );
      }
    }

    await db.insert(posts).values({
      groupId: session.groupId,
      authorId: member.id,
      title,
      body,
      videoUrl,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
