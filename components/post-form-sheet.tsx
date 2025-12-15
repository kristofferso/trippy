"use client";

import { useRouter } from "next/navigation";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PostForm, type PostFormProps } from "@/components/post-form";

export function PostFormSheet(props: PostFormProps) {
  const router = useRouter();

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="sm:max-w-2xl w-full border-0 p-0 shadow-2xl sm:shadow-xl rounded-t-3xl sm:rounded-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6 top-auto translate-y-0 sm:top-1/2 sm:-translate-y-1/2">
        <div className="max-h-[90dvh] overflow-y-auto p-6 pb-8">
          <PostForm {...props} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
