import { env } from "../config/env.js";
import { prisma } from "./prisma.js";
import { scoreMatch } from "./scoring.js";

const API_BASE = "https://api.football-data.org/v4";
const WORLD_CUP_COMPETITION_CODE = "WC";

export interface ProviderStandingRow {
  position: number;
  team: {
    id: string;
    name: string;
    shortName: string | null;
    countryCode: string | null;
    flagUrl: string | null;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface ProviderGroupStanding {
  group: string;
  rows: ProviderStandingRow[];
}

function mapStatus(apiStatus: string): any {
  switch (apiStatus) {
    case "SCHEDULED":
    case "TIMED":
      return "SCHEDULED";
    case "IN_PLAY":
    case "PAUSED":
      return "LIVE";
    case "FINISHED":
    case "AWARDED":
      return "FINISHED";
    case "SUSPENDED":
    case "POSTPONED":
    case "CANCELLED":
      return "VOID";
    default:
      return "SCHEDULED";
  }
}

function mapStage(apiStage: string): any {
  switch (apiStage) {
    case "GROUP_STAGE": return "GROUP";
    case "LAST_32": return "ROUND_OF_32";
    case "LAST_16": return "ROUND_OF_16";
    case "QUARTER_FINALS": return "QUARTER_FINAL";
    case "SEMI_FINALS": return "SEMI_FINAL";
    case "THIRD_PLACE": return "THIRD_PLACE";
    case "FINAL": return "FINAL";
    default: return "GROUP";
  }
}

// Extract the 90-minute score. For REGULAR matches fullTime = 90min.
// For EXTRA_TIME/PENALTY_SHOOTOUT the API provides regularTime = 90min separately.
function getRegularTimeScore(score: any, side: "home" | "away"): number | null {
  const duration: string = score?.duration ?? "REGULAR";
  if (duration === "EXTRA_TIME" || duration === "PENALTY_SHOOTOUT") {
    return score?.regularTime?.[side] ?? null;
  }
  return score?.fullTime?.[side] ?? null;
}

// Extract all period-specific scores from the provider response.
function extractPeriodScores(score: any) {
  const duration: string = score?.duration ?? "REGULAR";
  const regularTimeHome = getRegularTimeScore(score, "home");
  const regularTimeAway = getRegularTimeScore(score, "away");

  let extraTimeHome: number | null = null;
  let extraTimeAway: number | null = null;
  let penaltiesHome: number | null = null;
  let penaltiesAway: number | null = null;

  if (duration === "EXTRA_TIME" || duration === "PENALTY_SHOOTOUT") {
    // extraTime from the API is the cumulative score at end of ET
    extraTimeHome = score?.extraTime?.home ?? null;
    extraTimeAway = score?.extraTime?.away ?? null;
  }
  if (duration === "PENALTY_SHOOTOUT") {
    penaltiesHome = score?.penalties?.home ?? null;
    penaltiesAway = score?.penalties?.away ?? null;
  }

  return { duration, regularTimeHome, regularTimeAway, extraTimeHome, extraTimeAway, penaltiesHome, penaltiesAway };
}

export async function fetchWorldCupMatches() {
  const apiKey = env.FOOTBALL_DATA_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    console.warn("FOOTBALL_DATA_API_KEY is missing. Skipping sync.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/competitions/WC/matches`, {
      headers: {
        "X-Auth-Token": apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const matches = (data as any).matches;

    // Ensure a TBD placeholder team exists for knockout slots with unknown teams.
    const tbdTeam = await prisma.team.upsert({
      where: { externalTeamId: "TBD" },
      update: {},
      create: { externalTeamId: "TBD", name: "TBD", shortName: "TBD" }
    });

    for (const m of matches) {
      // 1. Sync Teams (only when IDs are known)
      const homeTeam = m.homeTeam;
      const awayTeam = m.awayTeam;

      if (homeTeam.id) {
        await prisma.team.upsert({
          where: { externalTeamId: String(homeTeam.id) },
          update: {
            name: homeTeam.name,
            shortName: homeTeam.shortName || homeTeam.tla,
            flagUrl: homeTeam.crest
          },
          create: {
            externalTeamId: String(homeTeam.id),
            name: homeTeam.name,
            shortName: homeTeam.shortName || homeTeam.tla,
            flagUrl: homeTeam.crest
          }
        });
      }

      if (awayTeam.id) {
        await prisma.team.upsert({
          where: { externalTeamId: String(awayTeam.id) },
          update: {
            name: awayTeam.name,
            shortName: awayTeam.shortName || awayTeam.tla,
            flagUrl: awayTeam.crest
          },
          create: {
            externalTeamId: String(awayTeam.id),
            name: awayTeam.name,
            shortName: awayTeam.shortName || awayTeam.tla,
            flagUrl: awayTeam.crest
          }
        });
      }

      // 2. Sync Match — always upsert even when teams are TBD (knockout placeholders).
      const homeTeamRecord = homeTeam.id
        ? await prisma.team.findUnique({ where: { externalTeamId: String(homeTeam.id) } }) ?? tbdTeam
        : tbdTeam;
      const awayTeamRecord = awayTeam.id
        ? await prisma.team.findUnique({ where: { externalTeamId: String(awayTeam.id) } }) ?? tbdTeam
        : tbdTeam;

      const periods = extractPeriodScores(m.score);
      const newStatus = mapStatus(m.status);

      const existingMatch = await prisma.match.findUnique({
        where: { externalMatchId: String(m.id) }
      });

      const alreadyScored = existingMatch?.status === 'SCORED';
      const matchRecord = await prisma.match.upsert({
        where: { externalMatchId: String(m.id) },
        update: {
          // Update teams when real IDs become known (replace TBD placeholder).
          ...(homeTeam.id && { homeTeamId: homeTeamRecord.id }),
          ...(awayTeam.id && { awayTeamId: awayTeamRecord.id }),
          kickoffAt: new Date(m.utcDate),
          stage: mapStage(m.stage),
          groupName: m.group ? m.group.replace('GROUP_', '') : null,
          // Preserve SCORED status — don't let API override it.
          status: alreadyScored ? 'SCORED' : newStatus,
          // Always update period breakdown so admin can see the full picture.
          duration: periods.duration,
          regularTimeHome: periods.regularTimeHome,
          regularTimeAway: periods.regularTimeAway,
          extraTimeHome: periods.extraTimeHome,
          extraTimeAway: periods.extraTimeAway,
          penaltiesHome: periods.penaltiesHome,
          penaltiesAway: periods.penaltiesAway,
          // providerHomeScore/Away = 90-min score for discrepancy detection.
          providerHomeScore: periods.regularTimeHome,
          providerAwayScore: periods.regularTimeAway,
          // homeScore/awayScore = 90-min score, only written on first sync.
          ...(alreadyScored ? {} : {
            homeScore: periods.regularTimeHome,
            awayScore: periods.regularTimeAway,
          }),
        },
        create: {
          externalMatchId: String(m.id),
          homeTeamId: homeTeamRecord.id,
          awayTeamId: awayTeamRecord.id,
          kickoffAt: new Date(m.utcDate),
          stage: mapStage(m.stage),
          groupName: m.group ? m.group.replace('GROUP_', '') : null,
          status: newStatus,
          homeScore: periods.regularTimeHome,
          awayScore: periods.regularTimeAway,
          regularTimeHome: periods.regularTimeHome,
          regularTimeAway: periods.regularTimeAway,
          extraTimeHome: periods.extraTimeHome,
          extraTimeAway: periods.extraTimeAway,
          penaltiesHome: periods.penaltiesHome,
          penaltiesAway: periods.penaltiesAway,
          duration: periods.duration,
          providerHomeScore: periods.regularTimeHome,
          providerAwayScore: periods.regularTimeAway,
        }
      });

      // Auto-score only when both teams are real and provider marks FINISHED.
      if (homeTeam.id && awayTeam.id && newStatus === 'FINISHED' && periods.regularTimeHome !== null && periods.regularTimeAway !== null && matchRecord.status !== 'SCORED') {
        await scoreMatch(matchRecord.id);
      }
    }

    console.log(`Successfully synced ${matches.length} matches from Football-Data.org`);
  } catch (error) {
    console.error("Error syncing football matches:", error);
  }
}

function normalizeProviderGroup(group: string | null | undefined) {
  if (!group) return null;
  return group.replace(/^GROUP_/i, "").replace(/^Group\s+/i, "").trim().toUpperCase();
}

export async function fetchWorldCupStandings(): Promise<ProviderGroupStanding[]> {
  const apiKey = env.FOOTBALL_DATA_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error("FOOTBALL_DATA_API_KEY is missing");
  }

  const response = await fetch(`${API_BASE}/competitions/WC/standings`, {
    headers: {
      "X-Auth-Token": apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const standings = Array.isArray(data.standings) ? data.standings : [];

  return standings
    .map((standing: any) => {
      const group = normalizeProviderGroup(standing.group);
      if (!group || !Array.isArray(standing.table)) return null;

      return {
        group,
        rows: standing.table.map((row: any) => ({
          position: row.position,
          team: {
            id: String(row.team?.id),
            name: row.team?.name ?? "TBD",
            shortName: row.team?.shortName ?? row.team?.tla ?? null,
            countryCode: row.team?.tla ?? null,
            flagUrl: row.team?.crest ?? null
          },
          playedGames: row.playedGames ?? 0,
          won: row.won ?? 0,
          draw: row.draw ?? 0,
          lost: row.lost ?? 0,
          goalsFor: row.goalsFor ?? 0,
          goalsAgainst: row.goalsAgainst ?? 0,
          goalDifference: row.goalDifference ?? 0,
          points: row.points ?? 0
        }))
      } satisfies ProviderGroupStanding;
    })
    .filter((standing: ProviderGroupStanding | null): standing is ProviderGroupStanding => Boolean(standing));
}

export async function syncWorldCupStandings() {
  const groups = await fetchWorldCupStandings();
  const fetchedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.providerStanding.deleteMany({
      where: {
        competitionCode: WORLD_CUP_COMPETITION_CODE
      }
    });

    for (const group of groups) {
      for (const row of group.rows) {
        let teamRecord = null;

        if (row.team.id) {
          teamRecord = await tx.team.upsert({
            where: { externalTeamId: row.team.id },
            update: {
              name: row.team.name,
              shortName: row.team.shortName,
              countryCode: row.team.countryCode,
              flagUrl: row.team.flagUrl
            },
            create: {
              externalTeamId: row.team.id,
              name: row.team.name,
              shortName: row.team.shortName,
              countryCode: row.team.countryCode,
              flagUrl: row.team.flagUrl
            }
          });
        }

        await tx.providerStanding.create({
          data: {
            competitionCode: WORLD_CUP_COMPETITION_CODE,
            group: group.group,
            position: row.position,
            teamExternalId: row.team.id,
            teamId: teamRecord?.id ?? null,
            teamName: row.team.name,
            shortName: row.team.shortName,
            countryCode: row.team.countryCode,
            flagUrl: row.team.flagUrl,
            playedGames: row.playedGames,
            won: row.won,
            draw: row.draw,
            lost: row.lost,
            goalsFor: row.goalsFor,
            goalsAgainst: row.goalsAgainst,
            goalDifference: row.goalDifference,
            points: row.points,
            fetchedAt
          }
        });
      }
    }
  });

  return { groups, fetchedAt };
}

export async function getStoredWorldCupStandings(): Promise<{ groups: ProviderGroupStanding[]; fetchedAt: Date | null }> {
  const rows = await prisma.providerStanding.findMany({
    where: {
      competitionCode: WORLD_CUP_COMPETITION_CODE
    },
    orderBy: [
      { group: "asc" },
      { position: "asc" }
    ]
  });

  const grouped = new Map<string, ProviderStandingRow[]>();
  let fetchedAt: Date | null = null;

  for (const row of rows) {
    if (!fetchedAt || row.fetchedAt > fetchedAt) fetchedAt = row.fetchedAt;
    const groupRows = grouped.get(row.group) ?? [];
    groupRows.push({
      position: row.position,
      team: {
        id: row.teamExternalId,
        name: row.teamName,
        shortName: row.shortName,
        countryCode: row.countryCode,
        flagUrl: row.flagUrl
      },
      playedGames: row.playedGames,
      won: row.won,
      draw: row.draw,
      lost: row.lost,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDifference: row.goalDifference,
      points: row.points
    });
    grouped.set(row.group, groupRows);
  }

  return {
    groups: Array.from(grouped.entries()).map(([group, groupRows]) => ({
      group,
      rows: groupRows
    })),
    fetchedAt
  };
}
