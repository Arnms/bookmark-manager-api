/**
 * 인증 관련 스키마 정의
 * 회원가입, 로그인 등 인증 API에서 사용하는 Zod 스키마
 */

import { z } from 'zod';

// === 회원가입 스키마 ===
export const registerSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다.'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.'),
});

// === 로그인 스키마 ===
export const loginSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

// === 타입 추론 ===
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
