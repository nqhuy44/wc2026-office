import type { FastifyInstance } from "fastify";
import z from "zod";
import { prisma } from "../lib/prisma.js";
import { hashString, generatePasscode } from "../lib/auth-utils.js";
import { scoreMatch } from "../lib/scoring.js";
import { getChampionPickLockAt } from "./champion.js";
import {
  FALLBACK_LIVE_WINDOW_MS,
  PREDICTION_LOCK_SETTING_KEY,
  SCORE_BY_EXTRA_TIME_SETTING_KEY,
  HOPE_STAR_COUNT_SETTING_KEY,
  getLeagueLockAt,
  getLeaguePredictionLockMinutes,
  getLockAt,
  refreshLeagueMatchStatuses
} from "../lib/league-match-state.js";

const addMemberSchema = z.object({
  username: z.string().min(1),
  nickname: z.string().optional(),
  role: z.enum(["PLAYER", "ADMIN"]).default("PLAYER")
});

const updateMemberRoleSchema = z.object({
  role: z.enum(["PLAYER", "ADMIN"])
});

const updateScoreSchema = z.object({
  homeScore: z.number().int().min(0),      // 90-min score
  awayScore: z.number().int().min(0),
  duration: z.enum(["REGULAR", "EXTRA_TIME", "PENALTY_SHOOTOUT"]).default("REGULAR"),
  extraTimeHome: z.number().int().min(0).optional(),
  extraTimeAway: z.number().int().min(0).optional(),
  penaltiesHome: z.number().int().min(0).optional(),
  penaltiesAway: z.number().int().min(0).optional(),
});

const updateSettingsSchema = z.object({
  predictionLockMinutes: z.number().int().min(0).max(24 * 60),
  scoreByExtraTime: z.boolean().optional(),
  hopeStarCount: z.number().int().min(0).max(20).optional(),
});

const updateChampionPickLockSchema = z.object({
  lockAt: z.coerce.date()
});

export async function adminRoutes(app: FastifyInstance) {
  // ─── Member Management (Mapped to /admin/participants for frontend compatibility) ───

  app.get("/admin/participants", { preHandler: [app.requireAdmin] }, async (request) => {
    const leagueId = request.leagueMember?.leagueId || (request.headers["x-league-id"] as string);
    
    if (!leagueId) {
      return { participants: [] };
    }

    const members = await prisma.leagueMember.findMany({
      where: { leagueId },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Map to compat shape for frontend
    const mapped = members.map(m => ({
      id: m.id,
      nickname: m.nickname,
      role: m.role,
      confirmationStatus: m.confirmationStatus,
      joinedAt: m.joinedAt,
      createdAt: m.createdAt,
      username: m.user.username,
      displayName: m.user.displayName,
      isActive: true // Member is always active
    }));

    return { participants: mapped };
  });

  app.post("/admin/participants", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { username, nickname, role } = addMemberSchema.parse(request.body);
    const leagueId = request.leagueMember!.leagueId;

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() }
    });

    if (!user) {
      return reply.status(404).send({ error: "Not Found", code: "errUserNotFound" });
    }

    try {
      const member = await prisma.leagueMember.create({
        data: {
          leagueId,
          userId: user.id,
          nickname: nickname?.trim() || user.displayName,
          role
        },
        include: {
          user: true
        }
      });

      return {
        participant: {
          id: member.id,
          nickname: member.nickname,
          role: member.role,
          confirmationStatus: member.confirmationStatus,
          username: member.user.username,
          displayName: member.user.displayName
        },
        message: `Đã thêm ${member.nickname} vào giải đấu.`
      };
    } catch (e) {
      return reply.status(400).send({ error: "Bad Request", code: "errCannotAddMember" });
    }
  });

  // Toggle member confirmation status.
  app.put("/admin/participants/:memberId/toggle-confirmation", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { memberId } = request.params as { memberId: string };
    const leagueId = request.leagueMember!.leagueId;

    const member = await prisma.leagueMember.findFirst({
      where: { id: memberId, leagueId }
    });

    if (!member) {
      return reply.status(404).send({ error: "Not Found", code: "errMemberNotFound" });
    }

    const nextStatus = member.confirmationStatus === "CONFIRMED" ? "UNCONFIRMED" : "CONFIRMED";

    const updated = await prisma.leagueMember.update({
      where: { id: memberId },
      data: { confirmationStatus: nextStatus }
    });

    return {
      participant: {
        id: updated.id,
        nickname: updated.nickname,
        role: updated.role,
        confirmationStatus: updated.confirmationStatus
      },
      message: `Đã cập nhật trạng thái xác nhận thành ${nextStatus === "CONFIRMED" ? "Đã xác nhận" : "Chưa xác nhận"}`
    };
  });

  app.put("/admin/participants/:memberId/role", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { memberId } = request.params as { memberId: string };
    const { role } = updateMemberRoleSchema.parse(request.body);
    const leagueId = request.leagueMember!.leagueId;

    const member = await prisma.leagueMember.findFirst({
      where: { id: memberId, leagueId },
      include: { user: true }
    });

    if (!member) {
      return reply.status(404).send({ error: "Not Found", code: "errMemberNotFound" });
    }

    if (member.id === request.leagueMember!.id && role !== "ADMIN") {
      return reply.status(400).send({ error: "Bad Request", code: "errCannotChangeOwnLeagueRole" });
    }

    if (member.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await prisma.leagueMember.count({
        where: { leagueId, role: "ADMIN" }
      });
      if (adminCount <= 1) {
        return reply.status(400).send({ error: "Bad Request", code: "errCannotDemoteLastLeagueAdmin" });
      }
    }

    const updated = await prisma.leagueMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: true }
    });

    return {
      participant: {
        id: updated.id,
        nickname: updated.nickname,
        role: updated.role,
        confirmationStatus: updated.confirmationStatus,
        username: updated.user.username,
        displayName: updated.user.displayName
      },
      message: `Đã cập nhật vai trò của ${updated.nickname} thành ${updated.role}`
    };
  });

  // Remove member from League
  app.delete("/admin/participants/:memberId", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { memberId } = request.params as { memberId: string };
    const leagueId = request.leagueMember!.leagueId;

    const member = await prisma.leagueMember.findFirst({
      where: { id: memberId, leagueId }
    });

    if (!member) {
      return reply.status(404).send({ error: "Not Found", code: "errMemberNotFound" });
    }

    if (member.role === "ADMIN") {
      const adminCount = await prisma.leagueMember.count({
        where: { leagueId, role: "ADMIN" }
      });
      if (adminCount <= 1) {
        return reply.status(400).send({ error: "Bad Request", code: "errCannotRemoveLastLeagueAdmin" });
      }
    }

    await prisma.leagueMember.delete({
      where: { id: memberId }
    });

    return {
      success: true,
      message: `Đã xóa ${member.nickname} khỏi giải đấu.`
    };
  });

  app.post("/admin/participants/:memberId/reset-passcode", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { memberId } = request.params as { memberId: string };
    const leagueId = request.leagueMember!.leagueId;

    const member = await prisma.leagueMember.findFirst({
      where: { id: memberId, leagueId },
      include: { user: true }
    });

    if (!member) {
      return reply.status(404).send({ error: "Not Found", code: "errMemberNotFound" });
    }

    const newPasscode = generatePasscode();
    await prisma.user.update({
      where: { id: member.userId },
      data: { passcodeHash: hashString(newPasscode) }
    });

    await prisma.session.deleteMany({ where: { userId: member.userId } });

    return {
      participantId: member.id,
      nickname: member.nickname,
      passcode: newPasscode,
      message: `Đã reset mật khẩu cho ${member.nickname} thành: ${newPasscode}`
    };
  });

  app.get("/admin/matches/:leagueMatchId/predictions", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { leagueMatchId } = request.params as { leagueMatchId: string };
    const leagueId = request.leagueMember!.leagueId;

    await refreshLeagueMatchStatuses(leagueId);

    const leagueMatch = await prisma.leagueMatch.findFirst({
      where: {
        id: leagueMatchId,
        leagueId
      },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true
          }
        }
      }
    });

    if (!leagueMatch) {
      return reply.status(404).send({ error: "Not Found", code: "errMatchNotFound" });
    }

    if (!leagueMatch.isPredictionEnabled || ["SCHEDULED", "VOID"].includes(leagueMatch.status)) {
      return reply.status(400).send({ error: "Bad Request", code: "errMatchNotOpenForPredictions" });
    }

    const predictions = await prisma.prediction.findMany({
      where: {
        leagueMatchId,
        resultType: { not: "VOID" }
      },
      include: {
        member: {
          include: {
            user: {
              select: {
                username: true,
                displayName: true
              }
            }
          }
        }
      },
      orderBy: [
        { points: "desc" },
        { updatedAt: "asc" }
      ]
    });
    const predictedMemberIds = new Set(predictions.map((prediction) => prediction.memberId));
    const missingMembers = await prisma.leagueMember.findMany({
      where: {
        leagueId,
        id: { notIn: Array.from(predictedMemberIds) }
      },
      include: {
        user: {
          select: {
            username: true,
            displayName: true
          }
        }
      },
      orderBy: [
        { nickname: "asc" },
        { createdAt: "asc" }
      ]
    });

    return {
      leagueMatch,
      predictions: predictions.map((prediction) => ({
        id: prediction.id,
        homeScorePred: prediction.homeScorePred,
        awayScorePred: prediction.awayScorePred,
        isHopeStar: prediction.isHopeStar,
        points: prediction.points,
        resultType: prediction.resultType,
        createdAt: prediction.createdAt,
        updatedAt: prediction.updatedAt,
        member: {
          id: prediction.member.id,
          nickname: prediction.member.nickname,
          username: prediction.member.user.username,
          displayName: prediction.member.user.displayName
        }
      })),
      missingMembers: missingMembers.map((member) => ({
        id: member.id,
        nickname: member.nickname,
        role: member.role,
        username: member.user.username,
        displayName: member.user.displayName
      }))
    };
  });

  // ─── Match Management ───

  app.put("/admin/matches/:leagueMatchId/toggle-prediction", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { leagueMatchId } = request.params as { leagueMatchId: string };
    const { isPredictionEnabled } = z.object({ isPredictionEnabled: z.boolean() }).parse(request.body);
    const leagueId = request.leagueMember!.leagueId;

    await refreshLeagueMatchStatuses(leagueId);

    const leagueMatch = await prisma.leagueMatch.findFirst({
      where: {
        id: leagueMatchId,
        leagueId
      },
      include: { match: true }
    });

    if (!leagueMatch) {
      return reply.status(404).send({ error: "Not Found", code: "errMatchNotFound" });
    }

    if (["LIVE", "FINISHED", "SCORED", "VOID"].includes(leagueMatch.status)) {
      return reply.status(400).send({ error: "Bad Request", code: "errMatchCannotToggle" });
    }

    if (leagueMatch.status === "LOCKED" && !isPredictionEnabled) {
      return reply.status(400).send({ error: "Bad Request", code: "errMatchAlreadyLocked" });
    }

    const lockAt = leagueMatch.lockAt ?? await getLeagueLockAt(leagueId, leagueMatch.match.kickoffAt);

    if (isPredictionEnabled && lockAt <= new Date()) {
      return reply.status(400).send({ error: "Bad Request", code: "errMatchPastLockTime" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const leagueMatchUpdated = await tx.leagueMatch.update({
        where: { id: leagueMatchId },
        data: {
          isPredictionEnabled,
          status: isPredictionEnabled
            ? "OPEN"
            : leagueMatch.status === "OPEN"
              ? "SCHEDULED"
              : leagueMatch.status,
          lockAt: isPredictionEnabled ? lockAt : leagueMatch.lockAt,
          openedAt: isPredictionEnabled ? (leagueMatch.openedAt ?? new Date()) : leagueMatch.openedAt
        }
      });

      if (!isPredictionEnabled) {
        await tx.prediction.updateMany({
          where: { leagueMatchId },
          data: {
            points: 0,
            resultType: "VOID"
          }
        });
      }

      return leagueMatchUpdated;
    });

    return { leagueMatch: updated, message: `Đã ${isPredictionEnabled ? "mở" : "đóng"} dự đoán` };
  });

  app.put("/admin/matches/:leagueMatchId/lock-prediction", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { leagueMatchId } = request.params as { leagueMatchId: string };
    const leagueId = request.leagueMember!.leagueId;

    await refreshLeagueMatchStatuses(leagueId);

    const leagueMatch = await prisma.leagueMatch.findFirst({
      where: {
        id: leagueMatchId,
        leagueId
      }
    });

    if (!leagueMatch) {
      return reply.status(404).send({ error: "Not Found", code: "errMatchNotFound" });
    }

    if (!leagueMatch.isPredictionEnabled) {
      return reply.status(400).send({ error: "Bad Request", code: "errMatchNotOpen" });
    }

    if (["LIVE", "FINISHED", "SCORED", "VOID"].includes(leagueMatch.status)) {
      return reply.status(400).send({ error: "Bad Request", code: "errMatchAlreadyStarted" });
    }

    const updated = await prisma.leagueMatch.update({
      where: { id: leagueMatchId },
      data: {
        status: "LOCKED",
        lockAt: new Date()
      }
    });

    return { leagueMatch: updated, message: "Đã khóa dự đoán thủ công" };
  });

  app.put("/admin/matches/:leagueMatchId/unlock-prediction", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { leagueMatchId } = request.params as { leagueMatchId: string };
    const leagueId = request.leagueMember!.leagueId;

    await refreshLeagueMatchStatuses(leagueId);

    const leagueMatch = await prisma.leagueMatch.findFirst({
      where: {
        id: leagueMatchId,
        leagueId
      },
      include: { match: true }
    });

    if (!leagueMatch) {
      return reply.status(404).send({ error: "Not Found", code: "errMatchNotFound" });
    }

    if (leagueMatch.status !== "LOCKED") {
      return reply.status(400).send({ error: "Bad Request", code: "errMatchNotLocked" });
    }

    if (!leagueMatch.isPredictionEnabled) {
      return reply.status(400).send({ error: "Bad Request", code: "errMatchNotOpen" });
    }

    const lockAt = await getLeagueLockAt(leagueId, leagueMatch.match.kickoffAt);

    if (lockAt <= new Date() || leagueMatch.match.kickoffAt <= new Date()) {
      return reply.status(400).send({ error: "Bad Request", code: "errMatchPastKickoff" });
    }

    const updated = await prisma.leagueMatch.update({
      where: { id: leagueMatchId },
      data: {
        status: "OPEN",
        lockAt
      }
    });

    return { leagueMatch: updated, message: "Đã mở khóa dự đoán" };
  });

  app.put("/admin/matches/:matchId/score", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { matchId } = request.params as { matchId: string };
    const { homeScore, awayScore, duration, extraTimeHome, extraTimeAway, penaltiesHome, penaltiesAway } = updateScoreSchema.parse(request.body);
    const leagueId = request.leagueMember!.leagueId;

    await refreshLeagueMatchStatuses(leagueId);

    const leagueMatch = await prisma.leagueMatch.findFirst({
      where: {
        leagueId,
        matchId
      },
      include: { match: true }
    });

    if (!leagueMatch) {
      return reply.status(404).send({ error: "Not Found", code: "errMatchNotFound" });
    }

    const now = new Date();
    const hasProviderFinalState = ["FINISHED", "SCORED"].includes(leagueMatch.match.status);
    const fallbackLiveWindowEndsAt = new Date(leagueMatch.match.kickoffAt.getTime() + FALLBACK_LIVE_WINDOW_MS);
    const hasFallbackEnded = fallbackLiveWindowEndsAt <= now;
    const hasMissingScore = leagueMatch.match.homeScore === null || leagueMatch.match.awayScore === null;

    if (!leagueMatch.isPredictionEnabled) {
      return reply.status(400).send({ error: "Bad Request", code: "errManualScoreRequiresPredictionMatch" });
    }

    if (leagueMatch.match.kickoffAt > now) {
      return reply.status(400).send({ error: "Bad Request", code: "errMatchNotStarted" });
    }

    if (leagueMatch.status === "LIVE" || (!hasProviderFinalState && !hasFallbackEnded)) {
      return reply.status(400).send({ error: "Bad Request", code: "errMatchStillLive" });
    }

    if (leagueMatch.match.status === "SCORED") {
      return reply.status(409).send({ error: "Conflict", code: "errMatchAlreadyScored" });
    }

    if (!hasMissingScore) {
      return reply.status(409).send({ error: "Conflict", code: "errManualScoreAlreadyHasResult" });
    }

    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
        regularTimeHome: homeScore,
        regularTimeAway: awayScore,
        duration,
        extraTimeHome: extraTimeHome ?? null,
        extraTimeAway: extraTimeAway ?? null,
        penaltiesHome: penaltiesHome ?? null,
        penaltiesAway: penaltiesAway ?? null,
      }
    });

    await scoreMatch(match.id);

    return { match, message: "Đã cập nhật tỉ số và chấm điểm thành công!" };
  });

  // Returns SCORED matches where provider score now differs from the scored score.
  // Admin must confirm these before re-scoring is applied.
  app.get("/admin/score-discrepancies", { preHandler: [app.requireAdmin] }, async (request) => {
    const leagueId = request.leagueMember!.leagueId;

    const leagueMatches = await prisma.leagueMatch.findMany({
      where: {
        leagueId,
        status: "SCORED",
        isPredictionEnabled: true,
        match: {
          providerHomeScore: { not: null },
          providerAwayScore: { not: null },
        }
      },
      include: {
        match: {
          include: { homeTeam: true, awayTeam: true }
        }
      }
    });

    const discrepancies = leagueMatches
      .filter(lm =>
        lm.match.providerHomeScore !== null &&
        lm.match.providerAwayScore !== null &&
        (lm.match.providerHomeScore !== lm.match.homeScore ||
          lm.match.providerAwayScore !== lm.match.awayScore)
      )
      .map(lm => ({
        leagueMatchId: lm.id,
        matchId: lm.match.id,
        stage: lm.match.stage,
        groupName: lm.match.groupName,
        kickoffAt: lm.match.kickoffAt,
        homeTeam: { name: lm.match.homeTeam.name, flagUrl: lm.match.homeTeam.flagUrl },
        awayTeam: { name: lm.match.awayTeam.name, flagUrl: lm.match.awayTeam.flagUrl },
        scoredHomeScore: lm.match.homeScore,
        scoredAwayScore: lm.match.awayScore,
        providerHomeScore: lm.match.providerHomeScore,
        providerAwayScore: lm.match.providerAwayScore,
      }));

    return { discrepancies };
  });

  // Confirm a score correction: applies providerHomeScore/providerAwayScore to the match
  // and re-scores all non-VOID predictions. Admin cannot enter arbitrary scores here.
  app.put("/admin/matches/:matchId/rescore", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { matchId } = request.params as { matchId: string };
    const leagueId = request.leagueMember!.leagueId;

    const leagueMatch = await prisma.leagueMatch.findFirst({
      where: { leagueId, matchId },
      include: { match: true }
    });

    if (!leagueMatch) {
      return reply.status(404).send({ error: "Not Found", code: "errMatchNotFound" });
    }

    if (!leagueMatch.isPredictionEnabled) {
      return reply.status(400).send({ error: "Bad Request", code: "errManualScoreRequiresPredictionMatch" });
    }

    if (leagueMatch.match.status !== "SCORED") {
      return reply.status(400).send({ error: "Bad Request", code: "errMatchNotScored" });
    }

    const { providerHomeScore, providerAwayScore } = leagueMatch.match;

    if (providerHomeScore === null || providerAwayScore === null) {
      return reply.status(400).send({ error: "Bad Request", code: "errNoProviderScore" });
    }

    if (providerHomeScore === leagueMatch.match.homeScore && providerAwayScore === leagueMatch.match.awayScore) {
      return reply.status(400).send({ error: "Bad Request", code: "errScoreAlreadyMatches" });
    }

    await prisma.match.update({
      where: { id: matchId },
      data: { homeScore: providerHomeScore, awayScore: providerAwayScore }
    });

    await scoreMatch(matchId);

    return { message: "Đã xác nhận sửa tỉ số và chấm điểm lại thành công!" };
  });

  // ─── Bonus match toggle (knockout matches only) ───

  app.put("/admin/league-matches/:leagueMatchId/toggle-bonus", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { leagueMatchId } = request.params as { leagueMatchId: string };
    const leagueId = request.leagueMember!.leagueId;
    const { isBonus } = z.object({ isBonus: z.boolean() }).parse(request.body);

    const leagueMatch = await prisma.leagueMatch.findFirst({
      where: { id: leagueMatchId, leagueId },
      include: { match: { select: { stage: true } } }
    });

    if (!leagueMatch) {
      return reply.status(404).send({ error: "Not Found", code: "errMatchNotFound" });
    }

    const KNOCKOUT_STAGES = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"];
    if (!KNOCKOUT_STAGES.includes(leagueMatch.match.stage)) {
      return reply.status(400).send({ error: "Bad Request", code: "errNotKnockoutMatch" });
    }

    const updated = await prisma.leagueMatch.update({
      where: { id: leagueMatchId },
      data: { isBonus }
    });

    return { leagueMatch: updated, message: isBonus ? "Đã bật điểm bonus cho trận này" : "Đã tắt điểm bonus" };
  });

  // ─── Settings Management ───

  app.get("/admin/settings", { preHandler: [app.requireAdmin] }, async (request) => {
    const leagueId = request.leagueMember!.leagueId;
    const [predictionLockMinutes, scoreByExtraTimeSetting, hopeStarSetting] = await Promise.all([
      getLeaguePredictionLockMinutes(leagueId),
      prisma.appSetting.findUnique({
        where: { leagueId_key: { leagueId, key: SCORE_BY_EXTRA_TIME_SETTING_KEY } }
      }),
      prisma.appSetting.findUnique({
        where: { leagueId_key: { leagueId, key: HOPE_STAR_COUNT_SETTING_KEY } }
      })
    ]);

    return {
      settings: {
        predictionLockMinutes,
        scoreByExtraTime: scoreByExtraTimeSetting?.value === true,
        hopeStarCount: typeof hopeStarSetting?.value === "number" ? Math.trunc(hopeStarSetting.value as number) : 0,
      }
    };
  });

  app.put("/admin/settings", { preHandler: [app.requireAdmin] }, async (request) => {
    const leagueId = request.leagueMember!.leagueId;
    const { predictionLockMinutes, scoreByExtraTime, hopeStarCount } = updateSettingsSchema.parse(request.body);

    await prisma.$transaction(async (tx) => {
      await tx.appSetting.upsert({
        where: { leagueId_key: { leagueId, key: PREDICTION_LOCK_SETTING_KEY } },
        update: { value: predictionLockMinutes },
        create: { leagueId, key: PREDICTION_LOCK_SETTING_KEY, value: predictionLockMinutes }
      });

      if (scoreByExtraTime !== undefined) {
        await tx.appSetting.upsert({
          where: { leagueId_key: { leagueId, key: SCORE_BY_EXTRA_TIME_SETTING_KEY } },
          update: { value: scoreByExtraTime },
          create: { leagueId, key: SCORE_BY_EXTRA_TIME_SETTING_KEY, value: scoreByExtraTime }
        });
      }

      if (hopeStarCount !== undefined) {
        await tx.appSetting.upsert({
          where: { leagueId_key: { leagueId, key: HOPE_STAR_COUNT_SETTING_KEY } },
          update: { value: hopeStarCount },
          create: { leagueId, key: HOPE_STAR_COUNT_SETTING_KEY, value: hopeStarCount }
        });
      }

      const openMatches = await tx.leagueMatch.findMany({
        where: {
          leagueId,
          status: "OPEN",
          isPredictionEnabled: true
        },
        include: { match: true }
      });

      await Promise.all(
        openMatches.map((leagueMatch) =>
          tx.leagueMatch.update({
            where: { id: leagueMatch.id },
            data: {
              lockAt: getLockAt(leagueMatch.match.kickoffAt, predictionLockMinutes)
            }
          })
        )
      );
    });

    return {
      settings: {
        predictionLockMinutes,
        scoreByExtraTime: scoreByExtraTime ?? false,
        hopeStarCount: hopeStarCount ?? 0,
      },
      message: "Đã cập nhật cài đặt"
    };
  });

  // ─── Champion Team Management ───

  app.put("/admin/champion-pick-lock", { preHandler: [app.requireAdmin] }, async (request) => {
    const leagueId = request.leagueMember!.leagueId;
    const { lockAt } = updateChampionPickLockSchema.parse(request.body);

    const league = await prisma.league.update({
      where: { id: leagueId },
      data: { championPickLockAt: lockAt },
      select: { championPickLockAt: true }
    });

    const effectiveLockAt = getChampionPickLockAt(league.championPickLockAt);
    return {
      lockAt: effectiveLockAt,
      isLocked: new Date() >= effectiveLockAt,
      message: "Đã cập nhật thời điểm khóa dự đoán đội vô địch"
    };
  });

  app.put("/admin/champion-team", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const leagueId = request.leagueMember!.leagueId;
    const { teamId } = z.object({ teamId: z.string().nullable() }).parse(request.body);

    if (teamId) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) {
        return reply.status(404).send({ error: "Not Found", code: "errTeamNotFound" });
      }
    }

    const league = await prisma.league.update({
      where: { id: leagueId },
      data: { championTeamId: teamId ?? null },
      include: { championTeam: true }
    });

    return { championTeam: league.championTeam, message: "Đã cập nhật đội vô địch" };
  });

  // Sync matches from external API
  app.post("/admin/sync-matches", { preHandler: [app.requireAdmin] }, async (request) => {
    const leagueId = request.leagueMember!.leagueId;

    // Provider sync runs from backend cron. This action only attaches stored
    // global fixtures to the current league, so admin clicks cannot hit rate limits.
    const allGlobalMatches = await prisma.match.findMany({
      select: { id: true }
    });

    const existingLeagueMatches = await prisma.leagueMatch.findMany({
      where: { leagueId },
      select: { matchId: true }
    });

    const existingMatchIds = new Set(existingLeagueMatches.map(lm => lm.matchId));
    const newMatches = allGlobalMatches.filter(m => !existingMatchIds.has(m.id));

    if (newMatches.length > 0) {
      await prisma.leagueMatch.createMany({
        data: newMatches.map(m => ({
          leagueId,
          matchId: m.id,
          isPredictionEnabled: false,
          status: "SCHEDULED"
        })),
        skipDuplicates: true
      });
    }

    return {
      ok: true,
      message: `Đồng bộ thành công từ dữ liệu backend! ${newMatches.length} trận mới được thêm vào giải đấu.`
    };
  });
}
