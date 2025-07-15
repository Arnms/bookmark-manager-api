/**
 * 인증 서비스
 * 회원가입, 로그인, 사용자 정보 조회 등의 비즈니스 로직 처리
 */

import { prisma } from '../config/database';
import { hashPassword, verifyPassword } from '../utils/auth';
import { RegisterRequest, LoginRequest } from '../schemas/auth.schema';

// === 응답 타입 정의 ===
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

// === 에러 타입 정의 ===
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// === 인증 서비스 클래스 ===
export class AuthService {
  /**
   * 회원가입 처리
   */
  async register(data: RegisterRequest): Promise<AuthUser> {
    const { email, password, name } = data;

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AuthError(
        '이미 존재하는 이메일 주소입니다.',
        'EMAIL_ALREADY_EXISTS',
        400
      );
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

    return user;
  }

  /**
   * 로그인 처리
   */
  async login(data: LoginRequest): Promise<AuthUser> {
    const { email, password } = data;

    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AuthError(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
        'INVALID_CREDENTIALS',
        401
      );
    }

    // 비밀번호 검증
    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      throw new AuthError(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
        'INVALID_CREDENTIALS',
        401
      );
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  /**
   * 사용자 정보 조회
   */
  async getMe(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AuthError(
        '사용자를 찾을 수 없습니다.',
        'USER_NOT_FOUND',
        404
      );
    }

    return user;
  }
}

// === 싱글톤 인스턴스 ===
export const authService = new AuthService();