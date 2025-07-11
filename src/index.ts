/**
 * 애플리케이션 진입점
 * 서버 시작 및 환경 설정 초기화
 */

import { buildApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './config/database.js'

const start = async () => {
  const app = await buildApp()

  try {
    // 데이터베이스 연결 확인
    await prisma.$connect()
    app.log.info('✅ 데이터베이스 연결 성공')

    // 서버 시작 (WSL 환경 고려)
    const host = '127.0.0.1'
    await app.listen({ port: env.PORT, host })
    
    app.log.info(`🚀 서버가 시작되었습니다`)
    app.log.info(`📍 URL: http://${host}:${env.PORT}`)
    app.log.info(`🔧 환경: ${env.NODE_ENV}`)
    app.log.info(`📊 헬스체크: http://${host}:${env.PORT}/health`)

  } catch (err) {
    app.log.error('❌ 서버 시작 실패:', err)
    await prisma.$disconnect()
    process.exit(1)
  }
}

// 안전한 종료 처리
process.on('SIGINT', async () => {
  console.log('\n🛑 서버 종료 중...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 서버 종료 중...')
  await prisma.$disconnect()
  process.exit(0)
})

start()
