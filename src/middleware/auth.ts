import { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export const requireAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    await request.jwtVerify();
  } catch (error) {
    return reply.status(401).send({
      error: '인증이 필요합니다.',
    });
  }
};

export const optionalAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    await request.jwtVerify();
  } catch (error) {
    // 선택적 인증이므로 에러를 무시하고 계속 진행
  }
};