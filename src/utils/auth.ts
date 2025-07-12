import bcrypt from 'bcryptjs';

// 비밀번호 해싱 관련 유틸리티
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT 토큰 관련 유틸리티
export interface JwtPayload {
  userId: string;
  email: string;
}