"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await loginAction(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (res?.success) {
        router.push("/dashboard");
      }
    });
  };

  return (
    <>
      <SiteHeader />
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-slate-500">Enter your credentials to sign in</p>
          </div>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline">
              Register
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

