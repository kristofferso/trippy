"use client";

import { upload } from "@vercel/blob/client";
import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Loader2,
  Video as VideoIcon,
  X,
  Plus,
  Upload,
} from "lucide-react";
import Image from "next/image";

import { createPost, updatePost } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateVideoThumbnail } from "@/lib/video";
import { cn } from "@/lib/utils";

type MediaItem = {
  id: string;
  type: "image" | "video";
  url?: string;
  file?: File;
  thumbnailUrl?: string;
  thumbnailFile?: File;
  previewUrl: string;
  isUploading?: boolean;
};

interface PostFormProps {
  groupId: string;
  groupSlug: string;
  initialData?: {
    id: string;
    title: string | null;
    body: string | null;
    media: { type: "image" | "video"; url: string; thumbnailUrl?: string }[];
  } | null;
}

export function PostForm({ groupId, groupSlug, initialData }: PostFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mediaItems, setMediaItems] = useState<MediaItem[]>(
    initialData?.media.map((m, i) => ({
      id: `existing-${i}`,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl,
      previewUrl: m.url, // For existing video, use url as preview (poster not perfect but ok) or thumbnailUrl
    })) || []
  );

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const newItems: MediaItem[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const type = file.type.startsWith("video/") ? "video" : "image";
        const id = `new-${Date.now()}-${i}`;

        let thumbnailFile: File | undefined;
        let previewUrl = URL.createObjectURL(file);

        if (type === "video") {
          try {
            const thumbBlob = await generateVideoThumbnail(file);
            thumbnailFile = new File([thumbBlob], "thumbnail.jpg", {
              type: "image/jpeg",
            });
            // Use thumbnail for preview if available, otherwise video file
            // Actually for <video> tag we can use the video file blob
          } catch (err) {
            console.error("Failed to generate thumbnail", err);
          }
        }

        newItems.push({
          id,
          type,
          file,
          previewUrl,
          thumbnailFile,
        });
      }
      setMediaItems((prev) => [...prev, ...newItems]);

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMedia = (id: string) => {
    setMediaItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl && item.file) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = formData.get("title")?.toString() || null;
    const body = formData.get("body")?.toString() || null;

    startTransition(async () => {
      try {
        const uploadUrl = `/api/upload?groupId=${groupId}`;
        const finalMedia: {
          type: "image" | "video";
          url: string;
          thumbnailUrl?: string;
        }[] = [];

        // Upload new files
        for (const item of mediaItems) {
          if (item.url) {
            // Existing item
            finalMedia.push({
              type: item.type,
              url: item.url,
              thumbnailUrl: item.thumbnailUrl,
            });
          } else if (item.file) {
            // New item
            let thumbnailUrl = item.thumbnailUrl;

            // Upload thumbnail if exists
            if (item.thumbnailFile) {
              const thumbUpload = await upload(
                item.thumbnailFile.name,
                item.thumbnailFile,
                {
                  access: "public",
                  handleUploadUrl: uploadUrl,
                }
              );
              thumbnailUrl = thumbUpload.url;
            }

            // Upload main file
            const fileUpload = await upload(item.file.name, item.file, {
              access: "public",
              handleUploadUrl: uploadUrl,
            });

            finalMedia.push({
              type: item.type,
              url: fileUpload.url,
              thumbnailUrl,
            });
          }
        }

        let result;
        if (initialData?.id) {
          result = await updatePost(initialData.id, title, body, finalMedia);
        } else {
          result = await createPost(
            title,
            body,
            null, // legacy videoUrl
            null, // legacy imageUrls
            groupId,
            null, // legacy thumbnailUrl
            finalMedia // new media items
          );
        }

        if (result.error) {
          setMessage(result.error || "Failed to save post");
          return;
        }

        router.refresh();
        if (initialData?.id) {
          router.push(`/g/${groupSlug}/post/${initialData.id}`);
        } else {
          router.push(`/g/${groupSlug}`);
        }
      } catch (error) {
        console.error(error);
        setMessage("Something went wrong");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-2xl mx-auto py-8 px-4"
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">
            {initialData ? "Edit Post" : "New Post"}
          </h1>
          <p className="text-slate-500">
            {initialData
              ? "Update your post details."
              : "Share photos and videos with the group."}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            name="title"
            id="title"
            placeholder="Trip planning"
            defaultValue={initialData?.title || ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Body</Label>
          <Textarea
            name="body"
            id="body"
            placeholder="What's on your mind?"
            className="min-h-[100px]"
            defaultValue={initialData?.body || ""}
          />
        </div>

        <div className="space-y-2">
          <Label>Media</Label>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {mediaItems.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200"
              >
                {item.type === "video" ? (
                  <video
                    src={item.previewUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}

                {/* Overlay Icon */}
                <div className="absolute left-2 top-2 rounded-md bg-black/50 p-1 text-white backdrop-blur-sm">
                  {item.type === "video" ? (
                    <VideoIcon className="h-4 w-4" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeMedia(item.id)}
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Add Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">Add Media</span>
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*,video/*"
            onChange={handleFiles}
          />
        </div>

        {message ? <p className="text-sm text-destructive">{message}</p> : null}

        <div className="flex items-center justify-end gap-4">
          <Button variant="ghost" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {initialData ? "Updating..." : "Posting..."}
              </>
            ) : initialData ? (
              "Update Post"
            ) : (
              "Create Post"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
