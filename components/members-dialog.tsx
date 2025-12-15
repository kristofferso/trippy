"use client";

import { Shield, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { deleteMember, getGroupMembers, toggleAdmin } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type GroupMember } from "@/db/schema";

export function MembersDialog({
  groupId,
  isAdmin,
}: {
  groupId: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<
    (Pick<GroupMember, "id" | "displayName" | "isAdmin"> & {
      isCurrentUser?: boolean;
      isUser?: boolean;
    })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getGroupMembers(groupId).then((data) => {
        setMembers(data);
        setLoading(false);
      });
    }
  }, [open, groupId]);

  const handleRemoveMember = (memberId: string) => {
    startTransition(async () => {
      const result = await deleteMember(memberId);
      if (result?.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      }
    });
  };

  const handleToggleAdmin = (memberId: string) => {
    startTransition(async () => {
      const result = await toggleAdmin(memberId);
      if (result?.success) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, isAdmin: result.isAdmin! } : m
          )
        );
      }
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-2 text-slate-500 hover:text-slate-900"
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Members</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Members</DialogTitle>
            <DialogTrigger asChild>
              <X className="size-5" />
            </DialogTrigger>
          </div>
          <DialogDescription>
            {members.length} people in this group.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                      {member.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none text-slate-900">
                        {member.displayName}
                        {member.isCurrentUser && " (You)"}
                      </p>
                      {member.isAdmin && (
                        <p className="text-[10px] uppercase tracking-wider text-blue-600 mt-0.5">
                          Admin
                        </p>
                      )}
                    </div>
                  </div>
                  {isAdmin && !member.isCurrentUser && (
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${
                          member.isAdmin
                            ? "text-blue-600 hover:text-blue-700"
                            : "text-slate-400 hover:text-slate-600"
                        } ${
                          !member.isUser ? "opacity-30 cursor-not-allowed" : ""
                        }`}
                        onClick={() =>
                          member.isUser && handleToggleAdmin(member.id)
                        }
                        disabled={pending || !member.isUser}
                        title={
                          !member.isUser
                            ? "Only registered users can be admins"
                            : member.isAdmin
                            ? "Remove admin"
                            : "Make admin"
                        }
                      >
                        {member.isAdmin ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {member.isAdmin ? "Remove admin" : "Make admin"}
                        </span>
                      </Button>
                      {!member.isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-600"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={pending}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {members.length === 0 && !loading && (
                <p className="text-center text-sm text-muted-foreground">
                  No members found.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
