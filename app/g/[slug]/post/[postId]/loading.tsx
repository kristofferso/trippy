import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-black">
      <Loader2 className="h-8 w-8 animate-spin text-white/50" />
    </div>
  );
}

