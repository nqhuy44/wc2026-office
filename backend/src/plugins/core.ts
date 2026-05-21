import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";

export async function registerCorePlugins(app: FastifyInstance) {
  await app.register(helmet);
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });
  await app.register(cookie, {
    secret: env.SESSION_SECRET
  });
}
