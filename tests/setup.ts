/**
 * 테스트 환경 설정
 * 각 테스트 전후 데이터베이스 정리 및 연결 관리
 */

import { prisma } from '../src/config/database';

beforeAll(async () => {
  // 테스트 데이터베이스 연결 확인
  await prisma.$connect();
  
  // 테스트 환경 확인
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('테스트는 NODE_ENV=test 환경에서만 실행해야 합니다.');
  }
});

afterAll(async () => {
  // 테스트 데이터 정리 (외래키 제약조건 순서 고려)
  await prisma.bookmarkTag.deleteMany({});
  await prisma.bookmark.deleteMany({});
  await prisma.websiteMetadata.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.$disconnect();
});

beforeEach(async () => {
  // 각 테스트 전에 데이터 정리 (외래키 제약조건 순서 고려)
  await prisma.bookmarkTag.deleteMany({});
  await prisma.bookmark.deleteMany({});
  await prisma.websiteMetadata.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});
});
