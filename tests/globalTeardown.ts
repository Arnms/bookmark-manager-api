/**
 * 글로벌 테스트 정리
 * 테스트 종료 후 테스트 데이터베이스 파일 삭제
 */

import fs from 'fs';
import path from 'path';

export default async () => {
  // 테스트 데이터베이스 파일 정리
  const testDbPath = path.resolve(process.cwd(), 'test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
};
