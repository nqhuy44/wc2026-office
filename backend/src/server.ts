import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { buildApp } from "./app.js";

const app = await buildApp();

const shutdown = async () => {
  app.log.info("Shutting down backend");
  await app.close();
  await prisma.$disconnect();
};

process.on("SIGINT", () => {
  shutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  shutdown().finally(() => process.exit(0));
});

await app.listen({
  host: env.HOST,
  port: env.PORT
});
