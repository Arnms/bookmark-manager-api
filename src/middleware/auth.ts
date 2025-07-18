/**
 * 인증 미들웨어 모듈
 * FastifyJWT를 이용한 필수/선택적 인증 처리
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { error } from '../utils/response';

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send(error('인증이 필요합니다.', 'UNAUTHORIZED'));
  }
};

export const optionalAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    await request.jwtVerify();
  } catch (err) {
    // 선택적 인증이므로 에러를 무시하고 계속 진행
  }
};
