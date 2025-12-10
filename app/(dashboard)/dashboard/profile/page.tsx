import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getUserSession } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { UpdateUsernameForm } from "@/components/update-username-form";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { AvatarUpload } from "@/components/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ProfilePage() {
  const session = await getUserSession();
  if (!session) redirect("/login");

  const user = {
    email: session.user.email,
    username: session.user.username,
  };

  return (
    <>
      <SiteHeader user={user} />
      <main className="container mx-auto max-w-2xl py-8 px-4 space-y-8">
        <div className="space-y-2">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-slate-500">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4 bg-white">
            <div>
              <h2 className="text-lg font-semibold">Avatar</h2>
              <p className="text-sm text-slate-500">
                Update your profile picture
              </p>
            </div>
            <AvatarUpload initialUrl={session.user.avatarUrl} />
          </div>

          <div className="rounded-lg border p-6 space-y-4 bg-white">
            <div>
              <h2 className="text-lg font-semibold">Account Information</h2>
              <p className="text-sm text-slate-500">
                Your basic account details
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                value={session.user.email} 
                disabled 
                className="bg-slate-50 max-w-sm"
              />
              <p className="text-xs text-slate-500">
                Email cannot be changed
              </p>
            </div>
          </div>

          <div className="rounded-lg border p-6 space-y-4 bg-white">
            <div>
              <h2 className="text-lg font-semibold">Display Name</h2>
              <p className="text-sm text-slate-500">
                How your name appears to other users
              </p>
            </div>
            <UpdateUsernameForm initialUsername={session.user.username || ""} />
          </div>

          <div className="rounded-lg border p-6 space-y-4 bg-white">
            <div>
              <h2 className="text-lg font-semibold">Password</h2>
              <p className="text-sm text-slate-500">
                Update your password to keep your account secure
              </p>
            </div>
            <UpdatePasswordForm />
          </div>
        </div>
      </main>
    </>
  );
}

