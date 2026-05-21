import { env } from "../config/env.js";
import { prisma } from "./prisma.js";
import { scoreMatch } from "./scoring.js";

const API_BASE = "https://api.football-data.org/v4";

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

        const homeScore = m.score?.fullTime?.home ?? null;
        const awayScore = m.score?.fullTime?.away ?? null;
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
