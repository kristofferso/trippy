"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, User, LogOut, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import trippi from "@/public/trippi.png";
import { NewPostDialog } from "@/components/new-post-dialog";
import { MembersDialog } from "@/components/members-dialog";
import { logoutAction } from "@/app/actions";

export function SiteHeader({
  groupName,
  groupSlug,
  isAdmin,
  groupId,
  user,
}: {
  groupName?: string;
  groupSlug?: string;
  isAdmin?: boolean;
  groupId?: string;
  user?: { username: string } | null;
}) {
  const pathname = usePathname();
  const isPostPage = pathname?.includes("/post/");

  return (
    <div className="sticky top-0 z-50 border-b bg-white/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {groupSlug && isPostPage ? (
            <Link href={`/g/${groupSlug}`}>
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 h-8 w-8 text-slate-500 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to group</span>
              </Button>
            </Link>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <Image src={trippi} alt="" className="size-8" />
              {!groupName && <p className="text-lg font-bold">Trippi</p>}
            </Link>
          )}

          {groupName && (
            <div className="flex items-center gap-2">
              {isPostPage && <div className="h-4 w-px bg-slate-200" />}
              <h1 className="text-sm font-semibold text-slate-900 sm:text-lg">
                {groupName}
              </h1>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {groupId && (
            <>
              <MembersDialog groupId={groupId} isAdmin={!!isAdmin} />
              {isAdmin && <NewPostDialog />}
            </>
          )}

          {/* If we are not in a group context or if we just want to show the user menu always */}
          {!groupId && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                    <span className="text-sm font-medium text-slate-600">
                      {user.username[0].toUpperCase()}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <form action={logoutAction}>
                   <button type="submit" className="w-full">
                    <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                   </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !groupId && (
             <Button asChild variant="ghost" size="sm">
               <Link href="/login">Login</Link>
             </Button>
          )}
        </div>
      </div>
    </div>
  );
}
