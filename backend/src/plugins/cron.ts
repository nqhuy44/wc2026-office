import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import cron from "node-cron";
import { fetchWorldCupMatches, syncWorldCupStandings } from "../lib/football-api.js";
import { autoSyncLeagueMatches, refreshLeagueMatchStatuses } from "../lib/league-match-state.js";
import { env } from "../config/env.js";

const cronPlugin: FastifyPluginAsync = async (app) => {
  const apiKeyPresent = env.FOOTBALL_DATA_API_KEY && env.FOOTBALL_DATA_API_KEY !== "your_api_key_here";
  let providerSyncRunning = false;

  if (!apiKeyPresent) {
    app.log.warn("Cron: FOOTBALL_DATA_API_KEY not set. API sync disabled, status refresh only.");
  }

  const syncProviderData = async () => {
    if (providerSyncRunning) {
      app.log.warn("Cron: provider sync skipped because previous run is still active.");
      return;
    }

    providerSyncRunning = true;
    try {
      app.log.info("Cron: Syncing World Cup matches and standings from provider...");
      await fetchWorldCupMatches();
      await syncWorldCupStandings();
      await autoSyncLeagueMatches();
    } catch (err) {
      app.log.error({ err }, "Cron: provider sync failed");
    } finally {
      providerSyncRunning = false;
    }
  };

  // Every 5 minutes: sync global match and standing data from Football-Data API.
  // User-facing requests read local DB and do not call the provider directly.
  if (apiKeyPresent) {
    cron.schedule("*/5 * * * *", syncProviderData);
    setImmediate(syncProviderData);
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
