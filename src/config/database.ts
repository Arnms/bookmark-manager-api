/**
 * 데이터베이스 설정 및 Prisma 클라이언트 관리
 * 싱글톤 패턴으로 데이터베이스 연결 관리
 */

import { PrismaClient } from '@prisma/client'
import { env, isDevelopment } from './env.js'

// Prisma 클라이언트 타입 확장
declare global {
  var __prisma: PrismaClient | undefined
}

// 데이터베이스 클라이언트 생성 함수
const createPrismaClient = () => {
  return new PrismaClient({
    log: isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  })
}

// 싱글톤 패턴으로 클라이언트 관리
export const prisma = globalThis.__prisma ?? createPrismaClient()

// 개발 환경에서 Hot Reload 시 재연결 방지
if (isDevelopment) {
  globalThis.__prisma = prisma
}

// 애플리케이션 종료 시 데이터베이스 연결 해제
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})