# Tech Stack

## 1. Goal

Dùng TypeScript để đơn giản hóa stack, dễ maintain và deploy.

## 2. Recommended Stack

```text
Next.js App Router
TypeScript
PostgreSQL
Prisma ORM
Tailwind CSS
shadcn/ui
Zod
React Hook Form
TanStack Query hoặc Server Actions
```

## 3. Frontend

### Framework

- Next.js App Router.
- React Server Components cho page data loading.
- Client Components cho forms/countdown/interactive UI.

### Styling

- Tailwind CSS.
- shadcn/ui cho component base.
- lucide-react cho icons.

### Forms

- React Hook Form.
- Zod validation.

### State

MVP có thể dùng:

- Server Components + Server Actions.
- Hoặc API routes + TanStack Query.

Khuyến nghị cho app này:

```text
Server Actions cho mutate đơn giản.
Route Handlers cho API nội bộ/admin/API sync.
```

## 4. Backend

Có thể dùng luôn Next.js backend:

- Route Handlers trong `app/api`.
- Server Actions cho form submit.
- Prisma Client để query PostgreSQL.
- Auth session bằng cookie.

Không cần tách FastAPI cho MVP.

## 5. Database

- PostgreSQL.
- Prisma ORM.

Hosted DB options:

- Supabase Postgres.
- Neon.
- Railway Postgres.
- Cloud SQL nếu deploy GCP.

## 6. Auth

Auth đơn giản bằng access code.

Flow:

1. Admin tạo participant.
2. Admin gán participant vào company.
3. System generate access code.
4. Lưu hash của code vào database.
5. Player nhập code.
6. Server verify hash và company active.
7. Tạo session cookie.

Role:

- `PLAYER`: user thường.
- `ADMIN`: quản lý đúng một company/league.
- `SUPER_ADMIN`: tạo company/league và admin ban đầu.

Package đề xuất:

- `bcryptjs` hoặc `argon2` để hash code.
- `jose` nếu dùng signed JWT cookie.
- Hoặc session table trong DB.

Khuyến nghị MVP:

```text
Session table + httpOnly cookie chứa session token random
```

## 7. Validation

Dùng Zod cho:

- Login form.
- Prediction input.
- Admin create participant.
- Admin match result.
- Admin open league match and set lock time.
- Import CSV validation.
- Export filters.

## 8. Background Jobs

MVP có thể dùng cron đơn giản:

- Vercel Cron.
- GitHub Actions gọi endpoint.
- Cloud Run Job.
- Node cron nếu self-host.

Jobs cần có:

- Sync match status.
- Lock league matches when `now >= lockAt`.
- Fetch external football data nếu tích hợp API.
- Recalculate leaderboard.

## 9. Deployment Options

### Option A: Vercel + Neon/Supabase

Phù hợp nhất nếu muốn nhanh.

```text
Next.js on Vercel
PostgreSQL on Neon/Supabase
Cron via Vercel Cron
```

### Option B: Docker Compose

Phù hợp chạy nội bộ hoặc VPS.

```text
nextjs-app
postgres
```

### Option C: Cloud Run

Phù hợp nếu muốn deploy kiểu DevOps/GCP.

```text
Cloud Run service
Cloud SQL PostgreSQL
Cloud Scheduler
```

## 10. Suggested Project Structure

```text
src/
  app/
    (auth)/login/page.tsx
    (main)/dashboard/page.tsx
    (main)/matches/page.tsx
    (main)/matches/[id]/page.tsx
    (main)/standings/page.tsx
    (main)/leaderboard/page.tsx
    (main)/predictions/page.tsx
    (main)/prize-pool/page.tsx
    (main)/rules/page.tsx
    admin/
      page.tsx
      participants/page.tsx
      matches/page.tsx
      donations/page.tsx
      exports/page.tsx
    api/
      auth/login/route.ts
      auth/logout/route.ts
      cron/sync-matches/route.ts
  components/
    layout/
    match/
    leaderboard/
    prediction/
    admin/
    ui/
  lib/
    auth.ts
    db.ts
    scoring.ts
    time.ts
    validators.ts
  server/
    actions/
    queries/
  styles/
prisma/
  schema.prisma
  migrations/
```

## 11. Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/fan_league"
SESSION_SECRET="change-me"
APP_BASE_URL="http://localhost:3000"
DEFAULT_LOCK_MINUTES=5
FOOTBALL_API_PROVIDER="manual"
FOOTBALL_API_KEY=""
```

## 12. Multi-company Scope

MVP hỗ trợ nhiều company trong cùng một web app.

Nguyên tắc:

- Participant thuộc đúng một company.
- Access code map trực tiếp tới participant và company.
- Admin thường thuộc đúng một company/league.
- Super admin tạo company/league, không dùng cho vận hành hằng ngày.
- Leaderboard, donations, prize pool, admin participant list, league match open/lock state đều filter theo company hiện tại.
- Teams/matches là fixture/kết quả World Cup dùng chung.
- `LeagueMatch` quyết định company nào mở fixture nào để dự đoán và khóa lúc nào.
