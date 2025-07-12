import { prisma } from '../src/config/database';

beforeAll(async () => {
  // 테스트 데이터베이스 연결 확인
  await prisma.$connect();
});

afterAll(async () => {
  // 테스트 데이터 정리
  await prisma.user.deleteMany({});
  await prisma.$disconnect();
});

beforeEach(async () => {
  // 각 테스트 전에 데이터 정리
  await prisma.user.deleteMany({});
});