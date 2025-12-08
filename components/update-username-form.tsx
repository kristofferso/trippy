"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUsernameAction } from "@/app/actions";

export function UpdateUsernameForm({ initialUsername }: { initialUsername: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateUsernameAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setMessage("Username updated successfully");
      }
    });
  }

  return (
    <form action={handleSubmit} className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input 
          id="username" 
          name="username" 
          placeholder="Your display name" 
          defaultValue={initialUsername}
          minLength={2}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm text-green-500">{message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}

