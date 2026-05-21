# Decoupling User and League Architecture (Self-Registration Flow)

This document outlines the architectural design to decouple **Users** and **Leagues** (formerly `Participant` and `Company`), implementing a simplified registration/login system and direct member enrollment.

## 1. Core Principles

- **Self-Registration**: Users can register their accounts using a unique `username` and a global `passcode` (password). No email or SSO is required.
- **Direct Addition**: League Admins add players to their leagues using their `username`. Enrollment is active immediately without verification or email notifications.
- **Empty State Dashboard**: If a user is registered but not yet added to any league, their dashboard displays an empty state containing their username to share with the League Admin.
- **League Switcher in Nav Bar**: Users participating in multiple leagues can switch between them using a dropdown selector in the main navigation bar.
- **Data Isolation**: Predictions, matches, settings, and points are scoped to the active league context.

---

## 2. Core User Flows

### A. Registration & Login Flow

```text
[Landing Page]
  |-- Login (Username + Passcode)
  +-- Register (Username + Passcode + Display Name)
```

1. **Sign Up**:
   - User navigates to `/register`.
   - User enters a unique `username` (alphanumeric, lowercase suggested), `displayName`, and a chosen `passcode` (password).
   - Backend hashes the passcode and creates a `User` record.
   - User is automatically logged in (Session created).
2. **Sign In**:
   - User enters `username` + `passcode` at `/login`.
   - Valid credentials establish a session.

### B. Empty State Dashboard (No Leagues)
If a user logs in but has not been added to any league (`memberships.length === 0`):

```text
+--------------------------------------------------------------+
|                     Welcome, [Display Name]!                 |
|                                                              |
|          You have not joined any prediction leagues yet.     |
|                                                              |
|          Please copy and send your username to your admin:   |
|                      [ username_of_player ]                  |
|                                                              |
|          Once added, refresh this page to start playing!     |
+--------------------------------------------------------------+
```

### C. Admin Add Flow (Direct Enrollment)
1. League Admin navigates to `/admin/members`.
2. Admin clicks **Add Member** and enters the player's exact `username`.
3. Backend validates that the `username` exists in the `User` table:
   - If not found, return an error: *"Username not found"*.
   - If found, create a `LeagueMember` record:
     - `userId`: `<user_id>`
     - `leagueId`: `<league_id>`
     - `nickname`: Defaults to user's `displayName` (can be overridden by admin).
     - `role`: `PLAYER` (default).
4. The user is now immediately active in the league. Next time they load the app (or refresh), the league will be available.

### D. Multi-League Navigation (League Switcher)
For users belonging to multiple leagues (`memberships.length > 1`):
1. In the main navigation bar (Nav Bar), a dropdown selection displays the current active League.
2. Clicking the dropdown displays the list of other leagues the user belongs to.
3. Selecting a different league:
   - Updates the client-side active league state (stored in `localStorage` or session state).
   - Appends the `X-League-ID: <league_id>` header to subsequent API requests.
   - Refreshes matching fixtures, leaderboard, and predictions for the newly selected league.

---

## 3. Database Schema (Prisma)

```prisma
enum ParticipantRole {
  PLAYER
  ADMIN
}

enum SystemRole {
  USER
  SUPER_ADMIN
}

enum ContributionStatus {
  UNPAID
  PAID
}

enum MatchStatus {
  SCHEDULED
  OPEN
  LOCKED
  LIVE
  FINISHED
  SCORED
  VOID
}

enum MatchStage {
  GROUP
  ROUND_OF_32
  ROUND_OF_16
  QUARTER_FINAL
  SEMI_FINAL
  THIRD_PLACE
  FINAL
}

enum MatchWinner {
  HOME
  AWAY
  DRAW
  UNKNOWN
}

enum PredictionResultType {
  PENDING
  EXACT_SCORE
  CORRECT_RESULT
  WRONG
  VOID
}

enum AuditEntityType {
  LEAGUE
  LEAGUE_MATCH
  MEMBER
  EXPORT
  TEAM
  MATCH
  PREDICTION
  SETTING
}

model User {
  id           String      @id @default(cuid())
  username     String      @unique
  passcodeHash String      // Hashed passcode (password) used globally
  displayName  String
  avatarUrl    String?
  role         SystemRole  @default(USER) // Platform-wide role
  isActive     Boolean     @default(true)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  sessions     Session[]
  memberships  LeagueMember[]
  auditLogs    AuditLog[]  @relation("AuditActor")

  @@index([username])
}

model Session {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model League {
  id        String         @id @default(cuid())
  name      String
  slug      String         @unique
  isActive  Boolean        @default(true)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  members       LeagueMember[]
  leagueMatches LeagueMatch[]
  settings      AppSetting[]
  auditLogs     AuditLog[]

  @@index([isActive])
}

model LeagueMember {
  id                 String             @id @default(cuid())
  leagueId           String
  userId             String
  nickname           String             // Player's display name inside this league
  role               ParticipantRole    @default(PLAYER)
  contributionStatus ContributionStatus @default(UNPAID)
  joinedAt           DateTime           @default(now())
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  league             League             @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  user               User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  predictions        Prediction[]

  @@unique([leagueId, userId]) // User can only join a league once
  @@unique([leagueId, nickname]) // Nicknames must be unique in a league
  @@index([leagueId])
  @@index([userId])
  @@index([role])
}

model Team {
  id             String    @id @default(cuid())
  externalTeamId String?   @unique
  name           String
  shortName      String?
  countryCode    String?
  flagUrl        String?
  logoUrl        String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  homeMatches    Match[]   @relation("HomeTeam")
  awayMatches    Match[]   @relation("AwayTeam")

  @@index([name])
}

model Match {
  id              String       @id @default(cuid())
  externalMatchId String?      @unique
  homeTeamId      String
  awayTeamId      String
  kickoffAt       DateTime
  stage           MatchStage
  groupName       String?
  venue           String?
  status          MatchStatus  @default(SCHEDULED)
  homeScore       Int?
  awayScore       Int?
  winner          MatchWinner  @default(UNKNOWN)
  resultSource    String?
  scoredAt        DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  homeTeam        Team         @relation("HomeTeam", fields: [homeTeamId], references: [id])
  awayTeam        Team         @relation("AwayTeam", fields: [awayTeamId], references: [id])
  leagueMatches   LeagueMatch[]

  @@index([kickoffAt])
  @@index([status])
}

model LeagueMatch {
  id                  String       @id @default(cuid())
  leagueId            String
  matchId             String
  status              MatchStatus  @default(SCHEDULED)
  isPredictionEnabled Boolean      @default(false)
  lockAt              DateTime?
  openedAt            DateTime?
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  league              League       @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  match               Match        @relation(fields: [matchId], references: [id], onDelete: Cascade)
  predictions         Prediction[]

  @@unique([leagueId, matchId])
  @@index([leagueId])
  @@index([matchId])
}

model Prediction {
  id               String               @id @default(cuid())
  leagueMatchId    String
  memberId         String               // References LeagueMember
  homeScorePred    Int
  awayScorePred    Int
  points           Int                  @default(0)
  resultType       PredictionResultType @default(PENDING)
  lockedSnapshotAt DateTime?
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt

  leagueMatch      LeagueMatch          @relation(fields: [leagueMatchId], references: [id], onDelete: Cascade)
  member           LeagueMember         @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([leagueMatchId, memberId])
  @@index([leagueMatchId])
  @@index([memberId])
}

model AppSetting {
  id        String   @id @default(cuid())
  leagueId  String
  key       String
  value     Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  league    League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)

  @@unique([leagueId, key])
}

model AuditLog {
  id          String          @id @default(cuid())
  leagueId    String?
  actorId     String?
  entityType  AuditEntityType
  entityId    String
  action      String
  before      Json?
  after       Json?
  createdAt   DateTime        @default(now())

  league      League?         @relation(fields: [leagueId], references: [id], onDelete: SetNull)
  actor       User?           @relation("AuditActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([leagueId])
  @@index([actorId])
}
