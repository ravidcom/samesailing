# SameSailing.com

Find and connect with fellow travelers on your exact cruise sailing before you even board. Search by ship and date, browse a partial, privacy-first profile of who else is aboard, join the sailing's group chat, and send private messages — all without ever sharing contact details.

Live at **[samesailing.vercel.app](https://samesailing.vercel.app)**.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- [Supabase](https://supabase.com) — Postgres, Auth (email/password + Google/Facebook OAuth), and Realtime for live group chat, DMs, and notifications
- Real Royal Caribbean sailing data (`lib/data/royal-caribbean-sailings.json`), served to the client through Next.js Server Actions so the dataset itself never ships to the browser

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll need a `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for auth and data to work — see `supabase/schema.sql` for the database schema (run manually in the Supabase SQL Editor; there's no migration tooling set up).

## Deployment

Deploys to Vercel automatically via the connected GitHub repository: pushes to a branch get a Preview deployment, pushes to `main` deploy to production. Preview deployments point at a separate staging Supabase project, so testing there never touches production data.
