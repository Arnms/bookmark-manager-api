/**
 * 북마크 API 간단 테스트
 */

import request from 'supertest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { prisma } from '../src/config/database';
import { hashPassword } from '../src/utils/auth';

describe('북마크 API 간단 테스트', () => {
  let app: FastifyInstance;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    // 테스트 데이터 정리
    await prisma.bookmarkTag.deleteMany({});
    await prisma.bookmark.deleteMany({});
    await prisma.websiteMetadata.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});

    // 테스트 사용자 생성
    const hashedPassword = await hashPassword('password123');
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}-${Math.random()}@example.com`,
        password: hashedPassword,
        name: '테스트 사용자',
      },
    });
    userId = user.id;

    // JWT 토큰 생성
    userToken = app.jwt.sign({
      userId: user.id,
      email: user.email,
    });
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await prisma.bookmarkTag.deleteMany({});
    await prisma.bookmark.deleteMany({});
    await prisma.websiteMetadata.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
    
    await app.close();
  });

  describe('POST /bookmarks - 북마크 생성', () => {
    it('기본 북마크 생성 성공', async () => {
      const bookmarkData = {
        url: 'https://example.com',
        personalTitle: '예제 사이트',
        personalNote: '유용한 예제 사이트',
        isPublic: false,
      };

      const response = await request(app.server)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookmarkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        personalTitle: '예제 사이트',
        personalNote: '유용한 예제 사이트',
        isPublic: false,
        websiteMetadata: {
          url: 'https://example.com',
        },
      });
    });

    it('인증 없이 요청 시 401 에러', async () => {
      const bookmarkData = {
        url: 'https://example.com',
        personalTitle: '인증 없음',
      };

      const response = await request(app.server)
        .post('/bookmarks')
        .send(bookmarkData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('잘못된 URL 형식 시 400 에러', async () => {
      const invalidData = {
        url: 'invalid-url',
        personalTitle: '잘못된 URL',
      };

      const response = await request(app.server)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /bookmarks - 북마크 목록 조회', () => {
    it('빈 목록 조회 성공', async () => {
      const response = await request(app.server)
        .get('/bookmarks')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('bookmarks');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.bookmarks).toHaveLength(0);
    });

    it('북마크 목록 조회 성공', async () => {
      // 테스트용 북마크 생성
      const websiteMetadata = await prisma.websiteMetadata.create({
        data: {
          url: 'https://test-list.com',
          title: '테스트 목록',
        },
      });

      await prisma.bookmark.create({
        data: {
          userId,
          websiteMetadataId: websiteMetadata.id,
          personalTitle: '목록 테스트',
          personalNote: '목록 조회 테스트용',
          categoryId: null,
          isPublic: false,
        },
      });

      const response = await request(app.server)
        .get('/bookmarks')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bookmarks).toHaveLength(1);
      expect(response.body.data.bookmarks[0]).toMatchObject({
        personalTitle: '목록 테스트',
        personalNote: '목록 조회 테스트용',
        isPublic: false,
      });
    });

    it('인증 없이 요청 시 401 에러', async () => {
      const response = await request(app.server)
        .get('/bookmarks')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /bookmarks/:id - 북마크 단일 조회', () => {
    it('북마크 단일 조회 성공', async () => {
      // 테스트용 북마크 생성
      const websiteMetadata = await prisma.websiteMetadata.create({
        data: {
          url: 'https://test-single.com',
          title: '단일 테스트',
        },
      });

      const bookmark = await prisma.bookmark.create({
        data: {
          userId,
          websiteMetadataId: websiteMetadata.id,
          personalTitle: '단일 조회 테스트',
          personalNote: '단일 북마크 조회 테스트',
          categoryId: null,
          isPublic: true,
        },
      });

      const response = await request(app.server)
        .get(`/bookmarks/${bookmark.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: bookmark.id,
        personalTitle: '단일 조회 테스트',
        personalNote: '단일 북마크 조회 테스트',
        isPublic: true,
        websiteMetadata: {
          url: 'https://test-single.com',
        },
      });
    });

    it('존재하지 않는 북마크 조회 시 404 에러', async () => {
      const response = await request(app.server)
        .get('/bookmarks/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /bookmarks/:id - 북마크 삭제', () => {
    it('북마크 삭제 성공 (소프트 삭제)', async () => {
      // 테스트용 북마크 생성
      const websiteMetadata = await prisma.websiteMetadata.create({
        data: {
          url: 'https://test-delete.com',
          title: '삭제 테스트',
        },
      });

      const bookmark = await prisma.bookmark.create({
        data: {
          userId,
          websiteMetadataId: websiteMetadata.id,
          personalTitle: '삭제할 북마크',
          personalNote: '삭제 테스트용',
          categoryId: null,
          isPublic: false,
        },
      });

      const response = await request(app.server)
        .delete(`/bookmarks/${bookmark.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('북마크가 성공적으로 삭제되었습니다.');

      // 소프트 삭제 확인
      const deletedBookmark = await prisma.bookmark.findUnique({
        where: { id: bookmark.id },
      });
      expect(deletedBookmark?.deletedAt).not.toBeNull();
    });

    it('존재하지 않는 북마크 삭제 시 404 에러', async () => {
      const response = await request(app.server)
        .delete('/bookmarks/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});