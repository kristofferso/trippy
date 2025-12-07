# Circle Feed

Circle Feed is a small Next.js app for running private invite-only groups. People join with a display name, admins can post updates (with optional videos), and everyone can comment or drop emoji reactions.

## Features

- Create groups with friendly slugs and optional passwords.
- Session-based access per group using HTTP-only cookies.
- Set a display name (and optional email) before participating.
- Admins can publish posts with text, titles, and stubbed video uploads.
- Members can add comments and emoji reactions, and admins can moderate comments and members.
- Built with shadcn/ui components and Tailwind CSS 4.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Database**: [Postgres](https://www.postgresql.org/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)

## Getting Started

Clone the repo and install dependencies:

```bash
git clone https://github.com/your-org/circle-feed
cd circle-feed
pnpm install
```

Copy the environment example and fill in your Postgres connection string:

```bash
cp .env.example .env
# edit .env to set POSTGRES_URL
```

### Database setup

With Postgres running and `POSTGRES_URL` configured, generate and run migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

You can inspect your data with:

```bash
pnpm db:studio
```

### Run the app

Start the Next.js development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to create or join a circle.

### Deploying

1. `BASE_URL`: Set this to your production domain.
2. `STRIPE_SECRET_KEY`: Use your Stripe secret key for the production environment.
3. `STRIPE_WEBHOOK_SECRET`: Use the webhook secret from the production webhook you created in step 1.
4. `POSTGRES_URL`: Set this to your production database URL.
5. `AUTH_SECRET`: Set this to a random string. `openssl rand -base64 32` will generate one.
6. `BLOB_READ_WRITE_TOKEN`: Needed for uploading videos to Vercel Blob storage. Create a Blob store in your Vercel dashboard
   (or via the Vercel CLI) and add a read/write token to your environment variables so `@vercel/blob` can call
   `put()` when handling uploads.
When deploying (e.g., to Vercel), add the same `POSTGRES_URL` environment variable in your project settings so the app can reach your production database.

## Other Templates

If you want a more feature-rich starter, consider:

- https://achromatic.dev
- https://shipfa.st
- https://makerkit.dev
- https://zerotoshipped.com
- https://turbostarter.dev
