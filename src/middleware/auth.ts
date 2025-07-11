import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../utils/auth.js';

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export const requireAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return reply.status(401).send({
        error: '인증 토큰이 필요합니다.',
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return reply.status(401).send({
        error: '유효하지 않은 토큰 형식입니다.',
      });
    }

    const payload = verifyToken(token);
    (request as any).currentUser = payload;
  } catch (error) {
    return reply.status(401).send({
      error: '유효하지 않은 토큰입니다.',
    });
  }
};

export const optionalAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      
      if (token) {
        const payload = verifyToken(token);
        (request as any).currentUser = payload;
      }
    }
  } catch (error) {
    // 선택적 인증이므로 에러를 무시하고 계속 진행
  }
};