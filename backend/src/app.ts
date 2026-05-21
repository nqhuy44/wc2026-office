import Fastify from "fastify";
import { registerCorePlugins } from "./plugins/core.js";
import { registerAuthPlugin } from "./plugins/auth.js";
import { registerCronPlugin } from "./plugins/cron.js";
import { registerRoutes } from "./routes/index.js";

type AppError = Error & {
  statusCode?: number;
};

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  await registerCorePlugins(app);
  await app.register(registerAuthPlugin);
  await app.register(registerCronPlugin);
  await registerRoutes(app);

  app.setErrorHandler((error: AppError, _request, reply) => {
    app.log.error(error);
    reply.status(error.statusCode ?? 500).send({
      error: error.name,
      message: error.message
    });
  });

  return app;
}
