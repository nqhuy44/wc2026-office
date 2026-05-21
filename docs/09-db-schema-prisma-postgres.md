# Database Schema - Prisma + PostgreSQL

## 1. Notes

- Database: PostgreSQL.
- ORM: Prisma.
- Datetime lưu UTC.
- Access code không lưu plain text, chỉ lưu hash.
- Prediction unique theo `(leagueMatchId, participantId)`.
- Participant thuộc đúng một company.
- Admin thường thuộc đúng một company; super admin tạo company/league.
- Nickname là identity hiển thị duy nhất trong MVP.
- Global `Match` là fixture/kết quả dùng chung; `LeagueMatch` là trạng thái mở dự đoán theo từng company/league.

## 2. Prisma Schema

File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ParticipantRole {
  PLAYER
  ADMIN
  SUPER_ADMIN
}

enum ContributionStatus {
  PENDING
  PAID
  WAIVED
  REFUNDED
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
  COMPANY
  LEAGUE_MATCH
  PARTICIPANT
  CONTRIBUTION
  EXPORT
  SPONSOR
  TEAM
  MATCH
  PREDICTION
  SETTING
}

model Company {
  id        String       @id @default(cuid())
  name      String
  slug      String       @unique
  isActive  Boolean      @default(true)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  participants Participant[]
  leagueMatches LeagueMatch[]
  sponsors     Sponsor[]
  settings     AppSetting[]
  auditLogs    AuditLog[]

  @@index([isActive])
}

model Participant {
  id             String              @id @default(cuid())
  companyId      String
  nickname       String              @unique
  role           ParticipantRole     @default(PLAYER)
  accessCodeHash String
  isActive       Boolean             @default(true)
  lastLoginAt    DateTime?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  company        Company             @relation(fields: [companyId], references: [id], onDelete: Cascade)
  sessions       Session[]
  contributions  Contribution[]
  predictions    Prediction[]
  auditLogs      AuditLog[]          @relation("AuditActor")

  @@index([companyId])
  @@index([role])
  @@index([isActive])
}

model Session {
  id            String       @id @default(cuid())
  tokenHash     String       @unique
  participantId String
  expiresAt     DateTime
  createdAt     DateTime     @default(now())

  participant   Participant  @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@index([participantId])
  @@index([expiresAt])
}

model Contribution {
  id            String               @id @default(cuid())
  participantId String
  amount        Decimal              @db.Decimal(12, 2)
  currency      String               @default("VND")
  status        ContributionStatus   @default(PENDING)
  paidAt        DateTime?
  note          String?
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt

  participant   Participant          @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@index([participantId])
  @@index([status])
}

model Sponsor {
  id                String    @id @default(cuid())
  companyId         String
  name              String
  amount            Decimal?  @db.Decimal(12, 2)
  currency          String    @default("VND")
  rewardDescription String?
  note              String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  company           Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
}

model Team {
  id             String    @id @default(cuid())
  externalTeamId String?
  name           String
  shortName      String?
  countryCode    String?
  flagUrl        String?
  logoUrl        String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  homeMatches    Match[]   @relation("HomeTeam")
  awayMatches    Match[]   @relation("AwayTeam")

  @@unique([externalTeamId])
  @@index([name])
  @@index([countryCode])
}

model Match {
  id              String       @id @default(cuid())
  externalMatchId String?
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

  @@unique([externalMatchId])
  @@index([kickoffAt])
  @@index([status])
  @@index([stage])
  @@index([homeTeamId])
  @@index([awayTeamId])
}

model LeagueMatch {
  id                  String       @id @default(cuid())
  companyId           String
  matchId             String
  status              MatchStatus  @default(SCHEDULED)
  isPredictionEnabled Boolean      @default(false)
  lockAt              DateTime?
  openedAt            DateTime?
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  company             Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  match               Match        @relation(fields: [matchId], references: [id], onDelete: Cascade)
  predictions         Prediction[]

  @@unique([companyId, matchId])
  @@index([companyId])
  @@index([matchId])
  @@index([status])
  @@index([isPredictionEnabled])
  @@index([lockAt])
}

model Prediction {
  id               String                 @id @default(cuid())
  leagueMatchId    String
  participantId    String
  homeScorePred    Int
  awayScorePred    Int
  points           Int                    @default(0)
  resultType       PredictionResultType   @default(PENDING)
  lockedSnapshotAt DateTime?
  createdAt        DateTime               @default(now())
  updatedAt        DateTime               @updatedAt

  leagueMatch      LeagueMatch            @relation(fields: [leagueMatchId], references: [id], onDelete: Cascade)
  participant      Participant            @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@unique([leagueMatchId, participantId])
  @@index([leagueMatchId])
  @@index([participantId])
  @@index([resultType])
  @@index([points])
}

model AppSetting {
  id        String   @id @default(cuid())
  companyId String
  key       String
  value     Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, key])
  @@index([companyId])
}

model AuditLog {
  id          String          @id @default(cuid())
  companyId   String?
  actorId     String?
  entityType  AuditEntityType
  entityId    String
  action      String
  before      Json?
  after       Json?
  createdAt   DateTime        @default(now())

  company     Company?        @relation(fields: [companyId], references: [id], onDelete: SetNull)
  actor       Participant?    @relation("AuditActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([companyId])
  @@index([actorId])
  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt])
}
```

## 3. Important Constraints

### Company scope

```prisma
Participant.companyId
LeagueMatch.companyId
Sponsor.companyId
AppSetting @@unique([companyId, key])
```

Đảm bảo leaderboard, prize pool, donations, admin settings và trạng thái mở trận dự đoán có thể tách theo từng công ty/league.

Admin thường chỉ thao tác trong company của chính mình. Match/team là dữ liệu World Cup dùng chung. Super admin tạo company/league và admin ban đầu.

### League match open/lock

```prisma
@@unique([companyId, matchId])
```

Mỗi company/league có thể quyết định fixture nào được mở dự đoán và `lockAt` riêng cho fixture đó. API sync tạo global `Match`, không tự động mở prediction.

### Prediction unique

```prisma
@@unique([leagueMatchId, participantId])
```

Đảm bảo mỗi người chỉ có một prediction cho mỗi trận đã mở trong league của mình.

Backend vẫn phải validate `participant.companyId == leagueMatch.companyId` trước khi tạo/update prediction.

### Team external ID

```prisma
@@unique([externalTeamId])
```

Dùng khi sync từ football API.

### Match external ID

```prisma
@@unique([externalMatchId])
```

Dùng khi sync lịch/kết quả từ external API.

## 4. Leaderboard Query Concept

Có thể tính leaderboard bằng aggregate từ `Prediction`.

Pseudo SQL:

```sql
SELECT
  p.participant_id,
  SUM(p.points) AS total_points,
  COUNT(*) FILTER (WHERE p.result_type = 'EXACT_SCORE') AS exact_score_count,
  COUNT(*) FILTER (WHERE p.result_type = 'CORRECT_RESULT') AS correct_result_count,
  COUNT(*) FILTER (WHERE p.result_type = 'WRONG') AS wrong_count,
  COUNT(*) AS predicted_count
FROM predictions p
JOIN league_matches lm ON lm.id = p.league_match_id
WHERE p.result_type != 'PENDING'
  AND lm.company_id = $1
GROUP BY p.participant_id
ORDER BY
  total_points DESC,
  exact_score_count DESC,
  correct_result_count DESC,
  predicted_count DESC;
```

## 5. Default App Settings

```json
{
  "appName": "Fan League",
  "timezone": "Asia/Ho_Chi_Minh",
  "defaultLockMinutes": 5,
  "contributionAmount": 200000,
  "currency": "VND",
  "prizeSplit": [
    { "rank": 1, "percentage": 60 },
    { "rank": 2, "percentage": 30 },
    { "rank": 3, "percentage": 10 }
  ],
  "predictionVisibility": "AFTER_LOCK"
}
```

## 6. Migration Commands

```bash
npx prisma init
npx prisma format
npx prisma migrate dev --name init
npx prisma generate
```

## 7. Seed Data Ideas

Seed nên tạo:

- 1-2 sample companies.
- Admin account.
- 3 sample participants.
- Contribution records.
- Sample teams.
- Sample matches.

Không commit access code thật vào repository.
