import { env } from "../config/env.js";
import { prisma } from "./prisma.js";
import { scoreMatch } from "./scoring.js";

const API_BASE = "https://api.football-data.org/v4";

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

function getScoreValue(score: any, side: "home" | "away") {
  const periods = [score?.fullTime, score?.regularTime, score?.halfTime];
  const period = periods.find((p) => typeof p?.[side] === "number");
  return period?.[side] ?? null;
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

    for (const m of matches) {
      // 1. Sync Teams
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

      // 2. Sync Match
      if (homeTeam.id && awayTeam.id) {
        const homeTeamRecord = await prisma.team.findUnique({ where: { externalTeamId: String(homeTeam.id) } });
        const awayTeamRecord = await prisma.team.findUnique({ where: { externalTeamId: String(awayTeam.id) } });

        if (!homeTeamRecord || !awayTeamRecord) continue;

        const homeScore = getScoreValue(m.score, "home");
        const awayScore = getScoreValue(m.score, "away");
        const newStatus = mapStatus(m.status);

        const existingMatch = await prisma.match.findUnique({
          where: { externalMatchId: String(m.id) }
        });

        const alreadyScored = existingMatch?.status === 'SCORED';
        const matchRecord = await prisma.match.upsert({
          where: { externalMatchId: String(m.id) },
          update: {
            kickoffAt: new Date(m.utcDate),
            stage: mapStage(m.stage),
            groupName: m.group ? m.group.replace('GROUP_', '') : null,
            // Preserve SCORED status — don't let API override it with LIVE/FINISHED/etc.
            status: alreadyScored ? 'SCORED' : newStatus,
            // Don't overwrite manually-entered scores for already-scored matches
            ...(alreadyScored ? {} : { homeScore, awayScore }),
          },
          create: {
            externalMatchId: String(m.id),
            homeTeamId: homeTeamRecord.id,
            awayTeamId: awayTeamRecord.id,
            kickoffAt: new Date(m.utcDate),
            stage: mapStage(m.stage),
            groupName: m.group ? m.group.replace('GROUP_', '') : null,
            status: newStatus,
            homeScore: homeScore,
            awayScore: awayScore,
          }
        });

        // If score changed and status is FINISHED or LIVE, trigger scoring
        if (newStatus === 'FINISHED' && homeScore !== null && awayScore !== null && matchRecord.status !== 'SCORED') {
          // Trận đấu vừa xong và có tỉ số, tự động chấm điểm!
          await scoreMatch(matchRecord.id);
        }
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
