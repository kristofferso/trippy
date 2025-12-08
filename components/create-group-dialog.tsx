"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGroup } from "@/app/actions";

export function CreateGroupDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = async () => {
    setError(null);
    startTransition(async () => {
      const res = await createGroup(
        slug,
        name,
        password || undefined
      );
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (res?.success) {
        router.push(`/g/${slug}`);
      }
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="default" 
            className="rounded-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Trip
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a new trip</DialogTitle>
          <DialogDescription>
            Create a shared space for your next adventure.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Trip Name</Label>
            <Input
              id="name"
              placeholder="e.g. Summer in Italy"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Group code</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">
                {process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
                  "trippi.dev"}
                /
              </span>
              <Input
                id="slug"
                placeholder="summer-italy"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password (Optional)</Label>
            <Input
              id="password"
              type="password"
              placeholder="Keep it secret"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        {error ? (
          <p className="text-sm text-destructive mb-4">{error}</p>
        ) : null}
        <Button
          onClick={handleCreate}
          disabled={pending || !name || !slug}
          className="w-full"
        >
          {pending ? "Creating..." : "Create Trip"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
