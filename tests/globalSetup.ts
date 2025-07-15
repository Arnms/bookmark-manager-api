/**
 * 글로벌 테스트 설정
 * 테스트 시작 전 환경변수 로드 및 데이터베이스 마이그레이션
 */

import dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';

export default async () => {
  // 테스트 환경변수 로드
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

  // 테스트 데이터베이스 스키마 푸시 (기존 데이터 삭제 후 재생성)
  try {
    execSync('npx prisma db push --force-reset', {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' },
    });
  } catch (error) {
    console.error('테스트 데이터베이스 스키마 푸시 실패:', error);
    throw error;
  }
};
