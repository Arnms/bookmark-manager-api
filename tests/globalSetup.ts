import dotenv from 'dotenv';
import path from 'path';

export default async () => {
  // 테스트 환경변수 로드
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
};