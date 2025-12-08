"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, User } from "lucide-react";

import { joinGroupBySlug } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordGate({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await joinGroupBySlug(slug, password, displayName, email);
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Lock className="h-6 w-6 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {name}
          </h1>
          <p className="text-sm text-slate-500">
            This group is private. Please sign in to join.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 rounded-xl border bg-white p-6">
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Access Code
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="h-10 bg-slate-50 border-0 focus-visible:ring-1"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="displayName"
                className="text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Your Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="h-10 pl-10 bg-slate-50 border-0 focus-visible:ring-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Email{" "}
                <span className="text-slate-300 normal-case tracking-normal">
                  (Optional)
                </span>
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-10 bg-slate-50 border-0 focus-visible:ring-1"
              />
            </div>
          </div>

          {message ? (
            <p className="text-center text-sm font-medium text-destructive animate-in fade-in">
              {message}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-full"
            disabled={pending || !password.trim() || !displayName.trim()}
          >
            {pending ? "Unlocking..." : "Join Group"}
            {!pending && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
