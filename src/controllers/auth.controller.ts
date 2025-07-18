/**
 * 인증 컨트롤러
 * HTTP 요청/응답 처리 및 JWT 토큰 생성
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authService, AuthError } from '../services/auth.service';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { success, error } from '../utils/response';

// === 타입 정의 ===
type RegisterRequest = FastifyRequest<{
  Body: z.infer<typeof registerSchema>;
}>;

type LoginRequest = FastifyRequest<{
  Body: z.infer<typeof loginSchema>;
}>;

type AuthenticatedRequest = FastifyRequest & {
  user: {
    userId: string;
    email: string;
  };
};

// === 인증 컨트롤러 클래스 ===
export class AuthController {
  /**
   * 회원가입 처리
   */
  async register(request: RegisterRequest, reply: FastifyReply) {
    try {
      // 요청 데이터 검증
      const userData = registerSchema.parse(request.body);

      // 사용자 생성
      const user = await authService.register(userData);

      // JWT 토큰 생성
      const token = request.server.jwt.sign({
        userId: user.id,
        email: user.email,
      });

      return reply.status(201).send(success({
        user,
        token,
      }, '회원가입이 완료되었습니다.'));
    } catch (error) {
      return this.handleError(error, reply, request.server.log);
    }
  }

  /**
   * 로그인 처리
   */
  async login(request: LoginRequest, reply: FastifyReply) {
    try {
      // 요청 데이터 검증
      const loginData = loginSchema.parse(request.body);

      // 로그인 처리
      const user = await authService.login(loginData);

      // JWT 토큰 생성
      const token = request.server.jwt.sign({
        userId: user.id,
        email: user.email,
      });

      return reply.status(200).send(success({
        user,
        token,
      }, '로그인이 완료되었습니다.'));
    } catch (error) {
      return this.handleError(error, reply, request.server.log);
    }
  }

  /**
   * 사용자 정보 조회
   */
  async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;

      // 사용자 정보 조회
      const user = await authService.getMe(userId);

      return reply.status(200).send(success({
        user,
      }, '사용자 정보를 성공적으로 조회했습니다.'));
    } catch (error) {
      return this.handleError(error, reply, request.server.log);
    }
  }

  /**
   * 에러 처리 헬퍼 메서드
   */
  private handleError(error: unknown, reply: FastifyReply, logger: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(error('입력 데이터가 유효하지 않습니다.', 'VALIDATION_ERROR'));
    }

    if (error instanceof AuthError) {
      return reply.status(error.statusCode).send(error(error.message, error.code));
    }

    logger.error(error);
    return reply.status(500).send(error('서버 오류가 발생했습니다.', 'INTERNAL_ERROR'));
  }
}

// === 싱글톤 인스턴스 ===
export const authController = new AuthController();