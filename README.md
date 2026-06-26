# Music Diary MVP

A private-first music diary and ranking app. Log songs, rank what actually mattered, calibrate taste with pairwise picks, and get recommendations from your explicit favorites.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + reusable UI components
- Prisma ORM + SQLite
- Auth.js (NextAuth Credentials)
- bcrypt password hashing
- Zod validation

## Features included

- Signup, login, logout, protected routes
- Demo account + seeded catalog (60 tracks)
- Diary entries with tier + mood/context tags
- Ranking system with tier base scores + Elo pairwise calibration
- Taste profile (top genres/moods/eras + anchors + recent phase)
- Recommendation engine with reason strings
- Weekly recap card data
- Settings (privacy default toggle, future integrations placeholder)

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create environment file:
   ```bash
   cp .env.example .env
   ```
3. Run database migration:
   ```bash
   npm run db:migrate -- --name init
   ```
4. Seed demo data:
   ```bash
   npm run db:seed
   ```
5. Start app:
   ```bash
   npm run dev
   ```

Open http://localhost:3000

## Environment

Create `.env` from `.env.example` and set:

- `DATABASE_URL`: SQLite file or deployed database connection string
- `NEXTAUTH_URL`: public base URL for Auth.js callbacks
- `NEXTAUTH_SECRET`: session signing secret
- `INTERNAL_JOB_SECRET`: bearer secret used by internal scheduled job routes

## Background jobs

The app includes two authenticated internal job endpoints:

- `POST /api/internal/jobs/recommendations`
- `POST /api/internal/jobs/weekly-recaps`
- `GET /api/internal/jobs/health`

Both require `Authorization: Bearer $INTERNAL_JOB_SECRET`.

The health endpoint returns scheduler freshness signals for recommendations and weekly recaps.

A scheduler-ready GitHub Actions workflow lives at `.github/workflows/internal-jobs.yml`.
To enable it in production, configure these repository secrets:

- `APP_BASE_URL`: deployed app URL, for example `https://your-app.example.com`
- `INTERNAL_JOB_SECRET`: same secret value configured in the deployed app environment

The workflow currently runs:

- recommendation refresh hourly
- weekly recap generation every Monday at 08:15 UTC

The workflow also runs an authenticated health check against
`GET /api/internal/jobs/health` after each job trigger (manual and scheduled)
and fails when the job system is degraded.

Rollout checklist and verification steps are documented in `docs/internal-jobs-rollout.md`.
After pushing workflow changes and setting secrets, you can manually trigger and watch a run with:

```bash
npm run ops:trigger-jobs
```

## Demo login

- email: `demo@musicdiary.app`
- password: `password123`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npx prisma generate --config=./prisma.config.ts`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:studio`
- `npm run ops:trigger-jobs`

## Ranking logic

- Each user-track pair stores a numeric score.
- Initial tier score:
  - Life Song: 1000
  - Elite: 850
  - Heavy Rotation: 700
  - Liked: 550
  - Not For Me: 250
- Diary entries add small recency/context boosts.
- Pairwise picks run Elo updates to reorder rankings over time.

## Recommendation logic

Recommendation score combines:

- Genre overlap with top-ranked tracks
- Frequent mood/context tags
- Artist/album adjacency
- Era proximity
- Higher boost from Life Song / Elite anchors
- Novelty (already logged tracks are excluded)

Each recommendation includes a readable reason string.

## Future roadmap

- Spotify import
- Apple Music import
- Friend taste comparison
- Shareable recap cards
- Mobile app
- More advanced recommendation model
