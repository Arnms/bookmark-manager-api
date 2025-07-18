import { test } from '@jest/globals';
import { buildApp } from '../src/app';
import { prisma } from '../src/config/database';
import { FastifyInstance } from 'fastify';

describe('Categories API', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(async () => {
    // 각 테스트 전에 사용자 데이터 정리
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' },
    });

    // 테스트 유저 생성 및 로그인
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      },
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password123',
      },
    });

    const loginData = JSON.parse(loginResponse.payload);
    if (loginResponse.statusCode !== 200) {
      console.log('Login failed:', loginResponse.payload);
    }
    authToken = loginData.data.token;
    userId = loginData.data.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' },
    });
    await app.close();
  });


  describe('POST /categories', () => {
    test('카테고리 생성 성공', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: '기술',
          description: '기술 관련 북마크',
          color: '#FF0000',
        },
      });

      expect(response.statusCode).toBe(201);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('기술');
      expect(data.data.description).toBe('기술 관련 북마크');
      expect(data.data.color).toBe('#FF0000');
    });

    test('카테고리 생성 - 필수 필드 누락', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          description: '설명만 있음',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    test('카테고리 생성 - 중복 이름', async () => {
      // 첫 번째 카테고리 생성
      await app.inject({
        method: 'POST',
        url: '/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: '기술',
        },
      });

      // 같은 이름으로 두 번째 카테고리 생성 시도
      const response = await app.inject({
        method: 'POST',
        url: '/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: '기술',
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
      expect(data.message).toBe('이미 존재하는 카테고리명입니다');
    });

    test('카테고리 생성 - 인증 토큰 없음', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/categories',
        payload: {
          name: '기술',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /categories', () => {

    test('카테고리 목록 조회 성공', async () => {
      // 테스트 카테고리들 생성
      await prisma.category.createMany({
        data: [
          { name: '기술', userId, description: '기술 관련' },
          { name: '뉴스', userId, description: '뉴스 관련' },
          { name: '엔터테인먼트', userId, description: '엔터테인먼트 관련' },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.categories).toHaveLength(3);
      expect(data.data.pagination.total).toBe(3);
    });

    test('카테고리 목록 조회 - 페이지네이션', async () => {
      // 테스트 카테고리들 생성
      await prisma.category.createMany({
        data: [
          { name: '기술', userId, description: '기술 관련' },
          { name: '뉴스', userId, description: '뉴스 관련' },
          { name: '엔터테인먼트', userId, description: '엔터테인먼트 관련' },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/categories?page=1&limit=2',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.categories).toHaveLength(2);
      expect(data.data.pagination.page).toBe(1);
      expect(data.data.pagination.limit).toBe(2);
      expect(data.data.pagination.total).toBe(3);
      expect(data.data.pagination.totalPages).toBe(2);
    });
  });

  describe('GET /categories/:id', () => {

    test('카테고리 단일 조회 성공', async () => {
      const category = await prisma.category.create({
        data: {
          name: '기술',
          description: '기술 관련 북마크',
          userId,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/categories/${category.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(category.id);
      expect(data.data.name).toBe('기술');
      expect(data.data.description).toBe('기술 관련 북마크');
    });

    test('카테고리 단일 조회 - 존재하지 않는 카테고리', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/categories/nonexistent',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
      expect(data.message).toBe('카테고리를 찾을 수 없습니다');
    });
  });

  describe('PUT /categories/:id', () => {
    let categoryId: string;

    beforeEach(async () => {
      const category = await prisma.category.create({
        data: {
          name: '기술',
          description: '기술 관련 북마크',
          userId,
        },
      });
      categoryId = category.id;
    });

    test('카테고리 수정 성공', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/categories/${categoryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: '프로그래밍',
          description: '프로그래밍 관련 북마크',
          color: '#00FF00',
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('프로그래밍');
      expect(data.data.description).toBe('프로그래밍 관련 북마크');
      expect(data.data.color).toBe('#00FF00');
    });

    test('카테고리 수정 - 존재하지 않는 카테고리', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/categories/nonexistent',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: '프로그래밍',
        },
      });

      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
      expect(data.message).toBe('카테고리를 찾을 수 없습니다');
    });
  });

  describe('DELETE /categories/:id', () => {
    let categoryId: string;

    beforeEach(async () => {
      const category = await prisma.category.create({
        data: {
          name: '기술',
          description: '기술 관련 북마크',
          userId,
        },
      });
      categoryId = category.id;
    });

    test('카테고리 삭제 성공', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/categories/${categoryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.message).toBe('카테고리가 성공적으로 삭제되었습니다');

      // 카테고리가 실제로 삭제되었는지 확인
      const deletedCategory = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      expect(deletedCategory).toBeNull();
    });

    test('카테고리 삭제 - 존재하지 않는 카테고리', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/categories/nonexistent',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
      expect(data.message).toBe('카테고리를 찾을 수 없습니다');
    });
  });
});