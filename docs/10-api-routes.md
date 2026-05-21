# API Routes

## 1. Auth

### POST `/api/auth/login`

Request:

```json
{
  "accessCode": "HUY-7K29"
}
```

Response:

```json
{
  "participant": {
    "id": "...",
    "nickname": "Huy",
    "role": "PLAYER",
    "company": {
      "id": "...",
      "name": "Acme Vietnam",
      "slug": "acme-vn"
    }
  }
}
```

### POST `/api/auth/logout`

Clear session cookie.

### GET `/api/me`

Return current session participant.

Include current company. Frontend dùng company này để hiển thị context và API/admin dùng để scope dữ liệu.

## 2. Matches

Player-facing match routes return `LeagueMatch` records joined with global `Match` fixture data. In UI, `:id` should be treated as `leagueMatchId` for prediction actions.

### GET `/api/matches`

Query params:

```text
status=OPEN|LOCKED|LIVE|FINISHED|SCORED
stage=GROUP|ROUND_OF_16|FINAL
opened=true|false
```

Returns company/league match view. Only matches opened for prediction are predict-able; API-synced fixtures may exist but remain not opened.

### GET `/api/matches/:id`

Return league match detail.

Include:

- Teams.
- League match open/lock state.
- Current user prediction.
- Visibility-safe prediction list.
- Result if available.

## 3. Predictions

### POST `/api/matches/:id/prediction`

Create or update current user's prediction.

Request:

```json
{
  "homeScorePred": 2,
  "awayScorePred": 1
}
```

Validation:

- User logged in.
- League match exists for current company.
- Current participant belongs to the same company as league match.
- League match is open for prediction.
- League match not locked.
- Score >= 0.
- Score <= 20.

### GET `/api/matches/:id/predictions`

Return predictions for a match.

Before lock:

```json
[
  {
    "participant": "Huy",
    "submitted": true
  }
]
```

After lock:

```json
[
  {
    "participant": "Huy",
    "homeScorePred": 2,
    "awayScorePred": 1,
    "points": 3,
    "resultType": "EXACT_SCORE"
  }
]
```

## 4. Leaderboard

### GET `/api/leaderboard`

Return leaderboard trong company hiện tại.

Response:

```json
[
  {
    "rank": 1,
    "participantId": "...",
    "nickname": "Minh",
    "totalPoints": 24,
    "exactScoreCount": 6,
    "correctResultCount": 6,
    "wrongCount": 3,
    "predictedCount": 15
  }
]
```

Include optional secondary stats:

```json
{
  "rows": [],
  "stats": {
    "mostExactScores": { "nickname": "Minh", "count": 6 },
    "mostCorrectResults": { "nickname": "Linh", "count": 8 },
    "mostSubmitted": { "nickname": "Huy", "count": 15 },
    "missedPredictions": { "nickname": "An", "count": 3 }
  }
}
```

## 5. Donations

### GET `/api/donations`

Return public prize pool donation data, including contributions and sponsors.

Fields:

- Participant nickname.
- Current company only.
- Amount.
- Status.
- Paid at.
- Sponsor name.
- Reward description.

## 6. Prize Pool

### GET `/api/prize-pool`

Return prize pool trong company hiện tại.

Response:

```json
{
  "participantContributionTotal": 4000000,
  "sponsorContributionTotal": 500000,
  "totalPrizePool": 4500000,
  "prizeSplit": [
    { "rank": 1, "percentage": 60, "amount": 2700000 },
    { "rank": 2, "percentage": 30, "amount": 1350000 },
    { "rank": 3, "percentage": 10, "amount": 450000 }
  ]
}
```

## 7. Admin Participants

### GET `/api/admin/participants`

Admin only.

### POST `/api/admin/participants`

Request:

```json
{
  "nickname": "Huy",
  "companyId": "optional-for-super-admin",
  "role": "PLAYER"
}
```

Response includes generated access code once.

Admin thường không được gửi `companyId`; server tự dùng company của admin hiện tại. Chỉ `SUPER_ADMIN` được chọn company khi tạo admin/player.

### POST `/api/admin/participants/:id/reset-code`

Generate new access code and store hash.

## 8. Admin Donations

### POST `/api/admin/contributions`

Create contribution.

### PATCH `/api/admin/contributions/:id`

Update amount/status/paidAt/note.

### POST `/api/admin/sponsors`

Create sponsor.

### PATCH `/api/admin/sponsors/:id`

Update sponsor.

## 9. Admin Matches

### POST `/api/admin/matches`

Create match manually.

### POST `/api/admin/matches/import`

Import CSV.

### PATCH `/api/admin/matches/:id`

Update global fixture metadata.

### POST `/api/admin/league-matches/:matchId/open`

Open a global fixture for prediction in current company/league.

Request:

```json
{
  "lockAt": "2026-06-12T14:55:00.000Z"
}
```

Validation:

- Admin belongs to current company.
- Match exists.
- `lockAt < kickoffAt`.
- Upsert unique `(companyId, matchId)`.

### PATCH `/api/admin/league-matches/:id`

Update league-specific prediction settings:

- `lockAt`.
- `isPredictionEnabled`.
- `status`.

### POST `/api/admin/league-matches/:id/lock`

Manually lock prediction for current company/league.

### PATCH `/api/admin/matches/:id/result`

Request:

```json
{
  "homeScore": 2,
  "awayScore": 1,
  "resultSource": "Manual"
}
```

### POST `/api/admin/matches/:id/score`

Calculate score for opened league matches of this global match.

### POST `/api/admin/matches/:id/void`

Void match.

## 10. Cron Routes

### POST `/api/cron/sync-match-status`

- Update match status based on current time.
- Update global match live/finished status if available.
- Update league match OPEN -> LOCKED if `now >= LeagueMatch.lockAt`.

### POST `/api/cron/sync-football-data`

- Fetch fixtures/results from provider.
- Update external match data.
- New fixtures remain not opened for prediction until admin opens them.
- Optional for MVP.

## 11. Admin Companies

Super admin only.

### GET `/api/admin/companies`

### POST `/api/admin/companies`

Create company and default settings.

### POST `/api/admin/companies/:id/admin`

Create initial admin for a company/league and return generated access code once.

## 12. Admin Exports

### POST `/api/admin/exports`

Generate export for current company/league.

Request:

```json
{
  "type": "MATCH_RESULTS",
  "format": "CSV",
  "filters": {
    "stage": "GROUP",
    "dateFrom": "2026-06-01",
    "dateTo": "2026-07-20"
  }
}
```

Types:

- `MATCH_RESULTS`
- `PREDICTION_RESULTS`
- `LEADERBOARD`
- `PREDICTION_HISTORY`
- `DONATIONS`
- `AUDIT_LOGS`

Formats:

- `CSV` for MVP.
- `XLSX` optional later.

## 13. Super Admin Platform-Wide Routes

Super Admin only. Protected by `/auth/me` checks verifying that the global role is `SUPER_ADMIN`.

### GET `/api/superadmin/leagues`

Get list of all leagues.

### POST `/api/superadmin/leagues`

Create a new league.

### DELETE `/api/superadmin/leagues/:leagueId`

Delete a league.

### GET `/api/superadmin/leagues/:leagueId/participants`

Get list of participants inside a league.

### POST `/api/superadmin/leagues/:leagueId/participants`

Add a global user to a league as a player or league admin.

### DELETE `/api/superadmin/participants/:memberId`

Remove a participant from a league.

### POST `/api/superadmin/participants/:memberId/reset-passcode`

Generate a new passcode for a league member user.

### GET `/api/superadmin/users`

Get all global users on the platform.

### POST `/api/superadmin/users/:userId/reset-passcode`

Reset passcode directly for a global user and invalidate active sessions.

### DELETE `/api/superadmin/users/:userId`

Delete a user permanently from the system (cascading through all memberships, predictions, and sessions).

### PUT `/api/superadmin/users/:userId/role`

Toggle a user's system role between `USER` and `SUPER_ADMIN`.

