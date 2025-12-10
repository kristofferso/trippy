import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Image from "next/image";
import { Suspense } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { VideoPlayer } from "@/components/video-player";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { PostInteractionsLoader } from "@/components/post-interactions-loader";

export async function PostDetailContent({
  postId,
  groupId,
  isAdmin,
}: {
  postId: string;
  groupId: string;
  isAdmin: boolean;
}) {
  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  if (!post || post.groupId !== groupId) notFound();

  // Normalize media items
  // If we have the new `media` JSON, use it.
  // Fallback to legacy `videoUrl` and `imageUrls` columns if `media` is empty.
  // This ensures backward compatibility until all data is migrated.
  let mediaItems: { type: "image" | "video"; url: string }[] =
    post.media && post.media.length > 0 ? post.media : [];

  if (mediaItems.length === 0) {
    if (post.videoUrl) {
      mediaItems.push({ type: "video", url: post.videoUrl });
    }
    if (post.imageUrls && post.imageUrls.length > 0) {
      mediaItems.push(
        ...post.imageUrls.map((url) => ({ type: "image" as const, url }))
      );
    }
  }

  return (
    <>
      {/* Main Content Layer */}
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-black">
        {mediaItems.length > 0 ? (
          <Carousel className="h-full w-full [&_[data-slot=carousel-content]]:h-full">
            <CarouselContent className="h-full">
              {mediaItems.map((item, index) => (
                <CarouselItem
                  key={index}
                  className="h-full flex items-center justify-center bg-black"
                >
                  <div className="relative h-full w-full flex items-center justify-center">
                    {item.type === "video" ? (
                      <VideoPlayer
                        src={item.url}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Image
                        src={item.url}
                        alt={`Media ${index + 1}`}
                        fill
                        className="object-contain"
                        priority={index === 0}
                      />
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {mediaItems.length > 1 && (
              <>
                <CarouselPrevious className="left-2 bg-black/20 border-none text-white hover:bg-black/40" />
                <CarouselNext className="right-2 bg-black/20 border-none text-white hover:bg-black/40" />
              </>
            )}
          </Carousel>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-8">
            <div className="max-w-2xl text-center">
              <h1 className="text-3xl font-bold text-white mb-6 md:text-5xl leading-tight">
                {post.title}
              </h1>
              {post.body && (
                <div className="prose prose-invert prose-lg max-w-none text-slate-200">
                  <p>{post.body}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Interaction Layer (Overlay Info + Actions) */}
      <Suspense fallback={null}>
        <PostInteractionsLoader
          postId={post.id}
          post={post}
          isAdmin={isAdmin}
        />
      </Suspense>
    </>
  );
}
