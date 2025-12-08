"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePasswordAction } from "@/app/actions";

export function UpdatePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updatePasswordAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setMessage("Password updated successfully");
        // Optional: clear the form
        const form = document.querySelector("form") as HTMLFormElement;
        form?.reset();
      }
    });
  }

  return (
    <form action={handleSubmit} className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input 
          id="currentPassword" 
          name="currentPassword" 
          type="password"
          placeholder="••••••••" 
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input 
          id="newPassword" 
          name="newPassword" 
          type="password"
          placeholder="••••••••" 
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input 
          id="confirmPassword" 
          name="confirmPassword" 
          type="password"
          placeholder="••••••••" 
          minLength={8}
          required
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm text-green-500">{message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
}

