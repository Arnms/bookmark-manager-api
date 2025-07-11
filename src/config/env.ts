/**
 * 환경변수 설정 및 검증
 * 모든 환경변수를 타입 안전하게 관리
 */

import { z } from 'zod'
import 'dotenv/config'

// 환경변수 스키마 정의
const envSchema = z.object({
  // 데이터베이스 설정
  DATABASE_URL: z.string().url('올바른 DATABASE_URL을 설정해주세요'),
  
  // JWT 설정
  JWT_SECRET: z.string().min(32, 'JWT_SECRET은 최소 32자 이상이어야 합니다'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  
  // 서버 설정
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // 로그 설정
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // CORS 설정
  CORS_ORIGIN: z.string().default('*'),
  
  // Rate Limiting 설정
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15분
  
  // 웹사이트 메타데이터 추출 설정
  METADATA_FETCH_TIMEOUT: z.coerce.number().default(5000),
  
  // 개발 환경 설정
  DEV_PRETTY_LOGS: z.coerce.boolean().default(true),
})

// 환경변수 파싱 및 검증
const parseEnv = () => {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    console.error('❌ 환경변수 설정 오류:', error)
    process.exit(1)
  }
}

// 검증된 환경변수 내보내기
export const env = parseEnv()

// 환경별 유틸리티 함수
export const isDevelopment = env.NODE_ENV === 'development'
export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'