"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { Loader2, Upload, User, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { updateUserAvatarAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  initialUrl?: string | null;
}

export function AvatarUpload({ initialUrl }: AvatarUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl || null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsUploading(true);

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload?type=avatar",
      });

      await updateUserAvatarAction(blob.url);
      setPreviewUrl(blob.url);
      router.refresh();
    } catch (error) {
      console.error("Upload failed", error);
      // Revert preview on error
      setPreviewUrl(initialUrl || null);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    try {
      await updateUserAvatarAction(null);
      setPreviewUrl(null);
      router.refresh();
    } catch (error) {
      console.error("Remove failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-6">
      <div className="relative group">
        <div className="h-24 w-24 overflow-hidden rounded-full border bg-slate-100 ring-4 ring-white shadow-sm">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
              <User className="h-10 w-10" />
            </div>
          )}
        </div>

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 ring-4 ring-white">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Photo
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Recommended: Square JPG, PNG or GIF, at least 400x400.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}

