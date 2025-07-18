/**
 * 인증 API 라우트
 * 회원가입, 로그인, 사용자 정보 조회 엔드포인트 제공
 */

import { FastifyInstance } from 'fastify';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

export default function authRoutes(fastify: FastifyInstance) {
  // === 회원가입 API ===
  fastify.post('/register', authController.register.bind(authController));

  // === 로그인 API ===
  fastify.post('/login', authController.login.bind(authController));

  // === 사용자 정보 조회 API ===
  fastify.get(
    '/me',
    {
      preHandler: requireAuth,
    },
    authController.getMe.bind(authController),
  );
}
