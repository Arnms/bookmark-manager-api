import { test } from '@jest/globals';
import { buildApp } from '../src/app';
import { prisma } from '../src/config/database';
import { FastifyInstance } from 'fastify';

describe('Tags API', () => {
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

  describe('POST /tags', () => {
    test('태그 생성 성공', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tags',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'JavaScript',
        },
      });

      if (response.statusCode !== 201) {
        console.log('Response:', response.payload);
      }
      expect(response.statusCode).toBe(201);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('JavaScript');
    });

    test('태그 생성 - 필수 필드 누락', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tags',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    test('태그 생성 - 중복 이름', async () => {
      // 첫 번째 태그 생성
      await app.inject({
        method: 'POST',
        url: '/tags',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'JavaScript',
        },
      });

      // 같은 이름으로 두 번째 태그 생성 시도
      const response = await app.inject({
        method: 'POST',
        url: '/tags',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'JavaScript',
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
      expect(data.message).toBe('이미 존재하는 태그입니다');
    });

    test('태그 생성 - 인증 토큰 없음', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tags',
        payload: {
          name: 'JavaScript',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /tags', () => {
    beforeEach(async () => {
      // 테스트 태그들 생성
      await prisma.tag.createMany({
        data: [
          { name: 'JavaScript', userId },
          { name: 'React', userId },
          { name: 'Node.js', userId },
        ],
      });
    });

    test('태그 목록 조회 성공', async () => {
      // 테스트 태그들 생성
      await prisma.tag.createMany({
        data: [
          { name: 'JavaScript_list', userId },
          { name: 'React_list', userId },
          { name: 'Node.js_list', userId },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/tags',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.tags.length).toBeGreaterThanOrEqual(3);
      expect(data.data.pagination.total).toBeGreaterThanOrEqual(3);
    });

    test('태그 목록 조회 - 페이지네이션', async () => {
      // 테스트 태그들 생성
      await prisma.tag.createMany({
        data: [
          { name: 'JavaScript_page', userId },
          { name: 'React_page', userId },
          { name: 'Node.js_page', userId },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/tags?page=1&limit=2',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.tags).toHaveLength(2);
      expect(data.data.pagination.page).toBe(1);
      expect(data.data.pagination.limit).toBe(2);
      expect(data.data.pagination.total).toBeGreaterThanOrEqual(3);
      expect(data.data.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });

    test('태그 목록 조회 - 검색', async () => {
      // 검색할 태그 생성
      await prisma.tag.create({
        data: {
          name: 'JavaScript_search',
          userId,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/tags?search=search',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.tags).toHaveLength(1);
      expect(data.data.tags[0].name).toBe('JavaScript_search');
    });
  });

  describe('GET /tags/:id', () => {
    let tagId: string;

    beforeEach(async () => {
      const tag = await prisma.tag.create({
        data: {
          name: 'JavaScript',
          userId,
        },
      });
      tagId = tag.id;
    });

    test('태그 단일 조회 성공', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/tags/${tagId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(tagId);
      expect(data.data.name).toBe('JavaScript');
    });

    test('태그 단일 조회 - 존재하지 않는 태그', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/tags/nonexistent',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
      expect(data.message).toBe('태그를 찾을 수 없습니다');
    });
  });

  describe('PUT /tags/:id', () => {
    let tagId: string;

    beforeEach(async () => {
      const tag = await prisma.tag.create({
        data: {
          name: 'JavaScript',
          userId,
        },
      });
      tagId = tag.id;
    });

    test('태그 수정 성공', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/tags/${tagId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'TypeScript',
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('TypeScript');
    });

    test('태그 수정 - 존재하지 않는 태그', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/tags/nonexistent',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'TypeScript',
        },
      });

      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
      expect(data.message).toBe('태그를 찾을 수 없습니다');
    });
  });

  describe('DELETE /tags/:id', () => {
    let tagId: string;

    beforeEach(async () => {
      const tag = await prisma.tag.create({
        data: {
          name: 'JavaScript',
          userId,
        },
      });
      tagId = tag.id;
    });

    test('태그 삭제 성공', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/tags/${tagId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.message).toBe('태그가 성공적으로 삭제되었습니다');

      // 태그가 실제로 삭제되었는지 확인
      const deletedTag = await prisma.tag.findUnique({
        where: { id: tagId },
      });
      expect(deletedTag).toBeNull();
    });

    test('태그 삭제 - 존재하지 않는 태그', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/tags/nonexistent',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
      expect(data.message).toBe('태그를 찾을 수 없습니다');
    });
  });

  describe('GET /tags/:id/bookmarks', () => {
    let tagId: string;
    let bookmarkId: string;

    beforeEach(async () => {
      const tag = await prisma.tag.create({
        data: {
          name: 'JavaScript',
          userId,
        },
      });
      tagId = tag.id;

      // 웹사이트 메타데이터 생성
      const metadata = await prisma.websiteMetadata.upsert({
        where: { url: 'https://example.com' },
        update: {},
        create: {
          url: 'https://example.com',
          title: 'Example',
        },
      });

      // 북마크 생성
      const bookmark = await prisma.bookmark.create({
        data: {
          userId,
          websiteMetadataId: metadata.id,
          personalTitle: 'JS 튜토리얼',
          personalNote: 'JavaScript 기초 튜토리얼',
        },
      });
      bookmarkId = bookmark.id;

      // 태그와 북마크 연결
      await prisma.bookmarkTag.create({
        data: {
          bookmarkId,
          tagId,
        },
      });
    });

    test('태그별 북마크 목록 조회 성공', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/tags/${tagId}/bookmarks`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('JavaScript');
      expect(data.data.bookmarks).toHaveLength(1);
      expect(data.data.bookmarks[0].title).toBe('JS 튜토리얼');
    });

    test('태그별 북마크 목록 조회 - 존재하지 않는 태그', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/tags/nonexistent/bookmarks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
      expect(data.message).toBe('태그를 찾을 수 없습니다');
    });
  });
});