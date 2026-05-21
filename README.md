# Fan League

World Cup 2026 office prediction league.

## Structure

```text
backend/   TypeScript Fastify API + Prisma
frontend/  TypeScript Next.js web app
docs/      Product and architecture docs
prototypes/ Static UI prototypes
```

## Local Development

1. Copy env files:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

2. Install dependencies:

```bash
npm install
```

3. Start Postgres:

```bash
docker compose up postgres
```

4. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Run apps:

```bash
npm run dev:backend
npm run dev:frontend
```

Backend: http://localhost:4000

Frontend: http://localhost:3000

## Docker

```bash
docker compose up --build
```

## Notes

- `Match` is the global fixture/result model.
- `LeagueMatch` controls whether a company/league opens a fixture for prediction and stores the league-specific lock time.
- Admin users are scoped to one company/league. `SUPER_ADMIN` manages companies/leagues.
