import fastify, { FastifyInstance } from 'fastify';

export function buildApp(): FastifyInstance {
  const app = fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
      },
    },
  });

  // 플러그인 등록
  app.register(require('@fastify/cors'), {
    origin: true,
  });
  app.register(require('@fastify/helmet'));
  app.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'secret-key',
  });

  app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}
