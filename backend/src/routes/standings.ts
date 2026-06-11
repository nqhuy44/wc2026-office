import type { FastifyInstance } from "fastify";
import { fetchWorldCupStandings } from "../lib/football-api.js";

export async function standingsRoutes(app: FastifyInstance) {
  app.get("/standings", { preHandler: [app.requireLeagueMember] }, async (_request, reply) => {
    try {
      const groups = await fetchWorldCupStandings();
      return {
        source: "provider",
        groups,
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      app.log.error({ err: error }, "Provider standings fetch failed");
      return reply.status(502).send({
        error: "Bad Gateway",
        code: "errProviderStandingsUnavailable"
      });
    }
  });
}
