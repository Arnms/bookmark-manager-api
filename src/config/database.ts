/**
 * 데이터베이스 설정 및 Prisma 클라이언트 관리
 * 싱글톤 패턴으로 데이터베이스 연결 관리
 */

import { PrismaClient } from '@prisma/client';
import { env, isDevelopment } from './env';

// Prisma 클라이언트 타입 확장
declare global {
  var __prisma: PrismaClient | undefined;
}

// 데이터베이스 클라이언트 생성 함수
const createPrismaClient = () => {
  // 테스트 환경에서는 TEST_DATABASE_URL 사용
  const databaseUrl =
    process.env.NODE_ENV === 'test'
      ? process.env.TEST_DATABASE_URL || env.DATABASE_URL
      : env.DATABASE_URL;

  return new PrismaClient({
    log: isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
};

// 싱글톤 패턴으로 클라이언트 관리
export const prisma = globalThis.__prisma ?? createPrismaClient();

// 개발 환경에서 Hot Reload 시 재연결 방지
if (isDevelopment) {
  globalThis.__prisma = prisma;
}

// 애플리케이션 종료 시 데이터베이스 연결 해제
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing database connection...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
