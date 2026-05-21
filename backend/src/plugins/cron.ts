import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import cron from "node-cron";
import { fetchWorldCupMatches } from "../lib/football-api.js";
import { refreshLeagueMatchStatuses } from "../lib/league-match-state.js";
import { env } from "../config/env.js";

const cronPlugin: FastifyPluginAsync = async (app) => {
  const apiKeyPresent = env.FOOTBALL_DATA_API_KEY && env.FOOTBALL_DATA_API_KEY !== "your_api_key_here";

  if (!apiKeyPresent) {
    app.log.warn("Cron: FOOTBALL_DATA_API_KEY not set. API sync disabled, status refresh only.");
  }

  // Every 5 minutes: sync global match data from Football-Data API (rate-limited)
  // This is separate from league-level operations — Match/Team records are system-wide entities.
  if (apiKeyPresent) {
    cron.schedule("*/5 * * * *", async () => {
      app.log.info("Cron: Syncing World Cup matches from API...");
      try {
        await fetchWorldCupMatches();
      } catch (err) {
        app.log.error({ err }, "Cron: fetchWorldCupMatches failed");
      }
    });
  }

  // Every minute: refresh league match statuses (auto-lock on kickoff, LIVE/FINISHED transitions).
  // Runs independently — works even when API is unavailable.
  cron.schedule("* * * * *", async () => {
    try {
      await refreshLeagueMatchStatuses();
    } catch (err) {
      app.log.error({ err }, "Cron: refreshLeagueMatchStatuses failed");
    }
  });
};

export const registerCronPlugin = fp(cronPlugin);
