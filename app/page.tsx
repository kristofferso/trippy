'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createGroup, joinGroupBySlug } from './actions';

export default function LandingPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Start a private circle</h1>
        <p className="text-muted-foreground">
          Create a private, invite-only feed for your closest people. Admins can post, everyone can
          comment and react with emojis.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground text-sm">
          <li>Optional group password for extra privacy.</li>
          <li>Identity is just a display name (email optional).</li>
          <li>Posts support text, titles, and optional videos.</li>
        </ul>
      </div>
      <div className="grid gap-4">
        <JoinCard />
        <CreateGroupCard />
      </div>
    </div>
  );
}

function JoinCard() {
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await joinGroupBySlug(slug.trim(), password);
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      router.push(`/g/${slug.trim()}`);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join a group</CardTitle>
        <CardDescription>Enter the group slug and password if needed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="join-slug">Slug</Label>
          <Input
            id="join-slug"
            placeholder="e.g. hansen-family"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="join-password">Password (optional)</Label>
          <Input
            id="join-password"
            type="password"
            placeholder="Only if the group is locked"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
        <Button className="w-full" onClick={handleSubmit} disabled={pending}>
          {pending ? 'Joining...' : 'Join group'}
        </Button>
      </CardContent>
    </Card>
  );
}

function CreateGroupCard() {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await createGroup(slug.trim(), name.trim(), password || undefined);
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      router.push(`/g/${slug.trim()}`);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a group</CardTitle>
        <CardDescription>Pick a friendly slug, add an optional password, and share the link.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="create-name">Group name</Label>
          <Input
            id="create-name"
            placeholder="My crew"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="create-slug">Slug</Label>
          <Input
            id="create-slug"
            placeholder="crew"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="create-password">Password (optional)</Label>
          <Input
            id="create-password"
            type="password"
            placeholder="Leave blank to keep open"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
        <Button className="w-full" onClick={handleSubmit} disabled={pending || !slug || !name}>
          {pending ? 'Creating...' : 'Create group'}
        </Button>
      </CardContent>
    </Card>
  );
}
