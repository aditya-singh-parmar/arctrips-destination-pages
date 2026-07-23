# Arc Trips — Destination Pages

Text- and image-heavy destination guide pages for the Arc Trips stays experience.
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase · Cloudinary · Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in Supabase + Cloudinary values
npm run dev                  # http://localhost:3000
```

The app renders from placeholder content when Supabase is not configured, so it
works locally and on preview before content is wired.

## Routes

- `/` — destinations index
- `/destinations/[slug]` — destination page (try `/destinations/tofino`, `/destinations/ucluelet`)

See [CLAUDE.md](CLAUDE.md) for conventions, credentials, content sourcing, and design rules.
