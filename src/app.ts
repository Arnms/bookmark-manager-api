/**
 * Fastify 애플리케이션 설정 및 빌드
 * 모든 플러그인과 라우트를 등록하여 완전한 앱 인스턴스 생성
 */

import fastify, { FastifyInstance } from 'fastify';
import { env, isDevelopment } from './config/env';

export async function buildApp(): Promise<FastifyInstance> {
  // Fastify 인스턴스 생성
  const app = fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        isDevelopment && env.DEV_PRETTY_LOGS
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // === 보안 및 기본 미들웨어 등록 ===

  // CORS 설정
  await app.register(import('@fastify/cors'), {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
    credentials: true,
  });

  // 보안 헤더 설정
  await app.register(import('@fastify/helmet'), {
    contentSecurityPolicy: false, // API 서버이므로 CSP 비활성화
  });

  // Rate Limiting 설정
  await app.register(import('@fastify/rate-limit'), {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: () => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '요청 횟수 제한을 초과했습니다. 잠시 후 다시 시도해주세요.',
      },
      timestamp: new Date().toISOString(),
    }),
  });

  // JWT 인증 플러그인
  await app.register(import('@fastify/jwt'), {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  // === 라우트 등록 ===
  
  // 인증 라우트
  await app.register(import('./routes/auth'), { prefix: '/auth' });

  // 북마크 라우트
  await app.register(import('./routes/bookmarks'), { prefix: '/bookmarks' });

  // === 기본 헬스체크 라우트 ===
  app.get('/health', async (request, reply) => {
    return {
      success: true,
      data: {
        status: 'ok',
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
      message: '서버가 정상적으로 동작 중입니다',
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}
