/**
 * 인증 API 라우트
 * 회원가입, 로그인, 사용자 정보 조회 엔드포인트 제공
 */

import { FastifyInstance } from 'fastify';
import { authController } from '../controllers/auth.controller';

export default async function authRoutes(fastify: FastifyInstance) {
  // === 회원가입 API ===
  fastify.post('/register', authController.register.bind(authController));

  // === 로그인 API ===
  fastify.post('/login', authController.login.bind(authController));

  // === 사용자 정보 조회 API ===
  fastify.get(
    '/me',
    {
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.status(401).send({ 
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: '인증이 필요합니다.'
            }
          });
        }
      },
    },
    authController.getMe.bind(authController)
  );
}
