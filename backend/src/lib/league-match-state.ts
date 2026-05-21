import { env } from "../config/env.js";
import { prisma } from "./prisma.js";

const TERMINAL_STATUSES = ["SCORED", "FINISHED", "VOID"] as const;
export const PREDICTION_LOCK_SETTING_KEY = "predictionLockMinutes";

function normalizeLockMinutes(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.trunc(value));
}

export function getLockAt(kickoffAt: Date, minutes: number) {
  return new Date(kickoffAt.getTime() - minutes * 60_000);
}

export function getDefaultLockAt(kickoffAt: Date) {
  return getLockAt(kickoffAt, env.PREDICTION_LOCK_MINUTES);
}

export async function getLeaguePredictionLockMinutes(leagueId: string) {
  const setting = await prisma.appSetting.findUnique({
    where: {
      leagueId_key: {
        leagueId,
        key: PREDICTION_LOCK_SETTING_KEY
      }
    }
  });

  return normalizeLockMinutes(setting?.value) ?? env.PREDICTION_LOCK_MINUTES;
}

export async function getLeagueLockAt(leagueId: string, kickoffAt: Date) {
  const minutes = await getLeaguePredictionLockMinutes(leagueId);
  return getLockAt(kickoffAt, minutes);
}

export async function refreshLeagueMatchStatuses(leagueId?: string) {
  const now = new Date();
  const leagueMatches = await prisma.leagueMatch.findMany({
    where: {
      ...(leagueId ? { leagueId } : {}),
      status: { notIn: [...TERMINAL_STATUSES] }
    },
    include: { match: true }
  });

  await Promise.all(
    leagueMatches.map(async (leagueMatch) => {
      let nextStatus = leagueMatch.status;

      if (TERMINAL_STATUSES.includes(leagueMatch.match.status as any)) {
        nextStatus = leagueMatch.match.status;
      } else if (leagueMatch.match.status === "LIVE") {
        nextStatus = "LIVE";
      } else if (
        leagueMatch.status === "OPEN" &&
        ((leagueMatch.lockAt && leagueMatch.lockAt <= now) || leagueMatch.match.kickoffAt <= now)
      ) {
        nextStatus = "LOCKED";
      }

      if (nextStatus === "VOID") {
        await prisma.prediction.updateMany({
          where: { leagueMatchId: leagueMatch.id },
          data: { points: 0, resultType: "VOID" }
        });
      }

      if (nextStatus === leagueMatch.status) return;

      await prisma.leagueMatch.update({
        where: { id: leagueMatch.id },
        data: { status: nextStatus }
      });
    })
  );
}
