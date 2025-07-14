/**
 * 인증 API 라우트
 * 회원가입, 로그인, 사용자 정보 조회 엔드포인트 제공
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/database';
import { hashPassword, verifyPassword } from '../utils/auth';

// === 스키마 검증 정의 ===

// 회원가입 스키마 검증
const registerSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다.'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.'),
});

// 로그인 스키마 검증
const loginSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export default async function authRoutes(fastify: FastifyInstance) {
  // === 회원가입 API ===
  fastify.post('/register', async (request, reply) => {
    try {
      const { email, password, name } = registerSchema.parse(request.body);

      // 이메일 중복 확인
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.status(400).send({
          error: '이미 존재하는 이메일 주소입니다.',
        });
      }

      // 비밀번호 해싱
      const hashedPassword = await hashPassword(password);

      // 사용자 생성
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      // JWT 토큰 생성
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email,
      });

      reply.status(201).send({
        message: '회원가입이 완료되었습니다.',
        user,
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: '입력 데이터가 유효하지 않습니다.',
          details: error.errors,
        });
      }

      fastify.log.error(error);
      reply.status(500).send({
        error: '서버 오류가 발생했습니다.',
      });
    }
  });

  // === 로그인 API ===
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      // 사용자 찾기
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return reply.status(401).send({
          error: '이메일 또는 비밀번호가 올바르지 않습니다.',
        });
      }

      // 비밀번호 검증
      const isValidPassword = await verifyPassword(password, user.password);

      if (!isValidPassword) {
        return reply.status(401).send({
          error: '이메일 또는 비밀번호가 올바르지 않습니다.',
        });
      }

      // JWT 토큰 생성
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email,
      });

      reply.send({
        message: '로그인이 완료되었습니다.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: '입력 데이터가 유효하지 않습니다.',
          details: error.errors,
        });
      }

      fastify.log.error(error);
      reply.status(500).send({
        error: '서버 오류가 발생했습니다.',
      });
    }
  });

  // === 사용자 정보 조회 API ===
  fastify.get(
    '/me',
    {
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.status(401).send({ error: '인증이 필요합니다.' });
        }
      },
    },
    async (request, reply) => {
      try {
        const payload = (request as any).user;

        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          return reply.status(404).send({
            error: '사용자를 찾을 수 없습니다.',
          });
        }

        reply.send({
          user,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({
          error: '서버 오류가 발생했습니다.',
        });
      }
    },
  );
}
