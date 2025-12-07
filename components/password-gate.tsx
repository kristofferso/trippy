'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { joinGroupBySlug } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PasswordGate({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await joinGroupBySlug(slug, password);
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Enter password</CardTitle>
        <CardDescription>
          <span className="font-semibold">{name}</span> is locked. Enter the shared password to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Group password"
            />
          </div>
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <Button type="submit" className="w-full" disabled={pending || !password.trim()}>
            {pending ? 'Checking...' : 'Join group'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
