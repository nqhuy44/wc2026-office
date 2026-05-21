# Architecture

## 1. High-level Architecture

```text
Browser
  -> Next.js App
    -> Server Components / Server Actions / API Routes
      -> Prisma
        -> PostgreSQL
```

Optional external integration:

```text
Cron Job
  -> /api/cron/sync-matches
    -> Football Data API
    -> PostgreSQL
```

## 2. Main Modules

### Auth Module

- Login bằng access code.
- Create session.
- Destroy session.
- Get current participant.
- Get current company from participant.
- Admin guard.
- Super admin guard.

### Company Module

- Company profile.
- Active/disabled state.
- Company/league setup by super admin.
- Admin belongs to one company/league.
- Scope participants, sponsors, settings, prize pool and admin views.

### Participant Module

- Nickname-only player identity.
- Access code management.
- Active/disabled state.
- Company membership.

### Contribution Module

- Track payment status.
- Total participant contribution.
- Paid/pending list.

### Sponsor Module

- Sponsor amount.
- Sponsor reward description.
- Sponsor note.

### Match Module

- Teams.
- Global fixtures from CSV/API.
- Kickoff time.
- Fixture status/result.
- Result.

### League Match Module

- Select which global fixtures are open for prediction in a company/league.
- Store company-specific prediction status.
- Store company-specific `lockAt`.
- Keep API-imported fixtures available without forcing every match into the game.

### Prediction Module

- Create/update prediction.
- Enforce league match open state and lock time.
- Hide predictions before lock.
- Show predictions after lock.

### Scoring Module

- Calculate points.
- Assign result type.
- Recalculate leaderboard.

### Admin Module

- Manage participants.
- Manage current company settings.
- Manage matches.
- Open/lock matches for prediction.
- Enter results.
- Trigger scoring.
- Export data.
- Audit changes.

## 3. Match Status Lifecycle

Global match lifecycle tracks real-world fixture/result state:

```text
SCHEDULED
  -> LIVE
  -> FINISHED
  -> SCORED
```

Special state:

```text
VOID
```

League match prediction lifecycle is scoped per company/league:

```text
NOT_OPENED
  -> OPEN
  -> LOCKED
  -> SCORED
```

`OPEN` and `LOCKED` are about prediction availability for a league, not whether the real match is live.

## 4. Prediction Lifecycle

```text
NOT_SUBMITTED
  -> SUBMITTED
  -> UPDATED
  -> LOCKED
  -> SCORED
```

Prediction không cần status riêng trong DB nếu trạng thái có thể suy ra từ `LeagueMatch` và `Match`.

## 5. Time Handling

Lưu tất cả datetime trong database theo UTC.

Frontend hiển thị theo timezone app, mặc định:

```text
Asia/Ho_Chi_Minh
```

Các field quan trọng:

- `kickoffAt`
- `LeagueMatch.lockAt`
- `createdAt`
- `updatedAt`
- `scoredAt`

## 6. Scoring Service

Scoring service nhận global match đã có final score.

Input:

- Match ID.
- Final home score.
- Final away score.
- League matches opened for that match.
- Predictions of each league match.

Output:

- Update points từng prediction.
- Update result type.
- Update global match status to `SCORED`.
- Update league match scoring state.
- Create audit log.

## 7. Leaderboard Calculation

MVP có thể tính động:

```sql
sum(predictions.points)
count(result_type = 'EXACT_SCORE')
count(result_type = 'CORRECT_RESULT')
count(predictions.id)
```

Nếu performance cần tối ưu, thêm bảng `leaderboard_snapshots`.

Leaderboard mặc định phải filter theo company hiện tại bằng participant membership và `LeagueMatch.companyId`.

Leaderboard response nên gồm cả secondary stats:

- Most exact scores.
- Most correct results.
- Longest exact-score streak.
- Most submitted predictions.
- Missed predictions.

## 8. Admin Audit

Các action nên audit:

- Create/update participant.
- Reset access code.
- Mark contribution paid.
- Create/update match.
- Open/lock league match.
- Change league match lock time.
- Update result.
- Recalculate score.
- Void match.
- Export data.

Audit log nên lưu:

- company id.
- actor admin id.
- action.
- entity type.
- entity id.
- before JSON.
- after JSON.
- created at.

## 9. Data Sync Strategy

### MVP Manual Mode

- Admin import fixtures.
- Admin opens selected fixtures for prediction in their league.
- Admin enter result.
- System scores.

Fixtures/matches dùng chung cho tất cả company. `LeagueMatch`, prediction, prize pool và leaderboard tách theo company.

### API Sync Mode

- Cron fetch fixtures/results.
- Match by external ID.
- Update kickoff/status/score.
- Newly synced fixtures default to not opened for prediction.
- Admin still can override.

## 10. Failure Handling

### Prediction submit failure

- Nếu fixture chưa được mở cho league hiện tại, reject.
- Nếu `now >= LeagueMatch.lockAt`, reject.
- Nếu match finished/scored/void, reject.
- Nếu score invalid, reject.

### Result update failure

- Nếu score missing, reject.
- Nếu match void, reject unless admin reopens.

### API sync failure

- Log error.
- Keep existing match data.
- Allow manual admin update.

## 11. Export Strategy

MVP export can be synchronous CSV for small internal leagues.

Exportable datasets:

- Match results.
- Prediction results by match.
- Leaderboard.
- Prediction history.
- Donations: contributions + sponsors.
- Audit logs.

Rules:

- Admin exports are scoped to their company/league.
- Super admin can export cross-company when explicitly selected.
- Every export should include generated timestamp, timezone, company/league, and filters.
- Large exports can later move to async `ExportJob`.
