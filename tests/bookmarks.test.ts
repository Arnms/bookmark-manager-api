/**
 * 북마크 API 테스트
 */

import request from 'supertest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { prisma } from '../src/config/database';
import { hashPassword } from '../src/utils/auth';

describe('북마크 API 테스트', () => {
  let app: FastifyInstance;
  let userToken: string;
  let userId: string;
  let categoryId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    // 각 테스트마다 새로운 사용자 생성
    const hashedPassword = await hashPassword('password123');
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}-${Math.random()}@example.com`,
        password: hashedPassword,
        name: '테스트 사용자',
      },
    });
    userId = user.id;

    // 테스트 카테고리 생성
    const category = await prisma.category.create({
      data: {
        name: '개발',
        description: '개발 관련 북마크',
        userId,
      },
    });
    categoryId = category.id;

    // JWT 토큰 생성
    userToken = app.jwt.sign({
      userId: user.id,
      email: user.email,
    });
  });

  afterEach(async () => {
    // 각 테스트 후 데이터 정리
    await prisma.bookmarkTag.deleteMany({});
    await prisma.bookmark.deleteMany({});
    await prisma.websiteMetadata.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // 테스트 데이터 정리 (순서 중요 - 외래키 제약 조건 때문에)
    await prisma.bookmarkTag.deleteMany({});
    await prisma.bookmark.deleteMany({});
    await prisma.websiteMetadata.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});

    await app.close();
  });

  describe('POST /bookmarks - 북마크 생성', () => {
    it('유효한 데이터로 북마크 생성 성공', async () => {
      const bookmarkData = {
        url: 'https://example.com',
        personalTitle: '예제 사이트',
        personalNote: '유용한 예제 사이트',
        categoryId,
        isPublic: false,
        tags: ['개발', '예제'],
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
        category: expect.objectContaining({
          name: '개발',
        }),
        tags: expect.arrayContaining([
          expect.objectContaining({
            tag: expect.objectContaining({
              name: '개발',
            }),
          }),
          expect.objectContaining({
            tag: expect.objectContaining({
              name: '예제',
            }),
          }),
        ]),
      });
    });

    it('필수 필드 누락 시 400 에러', async () => {
      const invalidData = {
        personalTitle: '제목만 있음',
      };

      const response = await request(app.server)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
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

    it('인증 토큰 없이 요청 시 401 에러', async () => {
      const bookmarkData = {
        url: 'https://example.com',
        personalTitle: '인증 없음',
      };

      const response = await request(app.server).post('/bookmarks').send(bookmarkData).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /bookmarks - 북마크 목록 조회', () => {
    let bookmarkId: string;

    beforeEach(async () => {
      // 테스트용 북마크 생성
      const websiteMetadata = await prisma.websiteMetadata.create({
        data: {
          url: 'https://test-list.com',
          title: '테스트 목록',
        },
      });

      const bookmark = await prisma.bookmark.create({
        data: {
          userId,
          websiteMetadataId: websiteMetadata.id,
          personalTitle: '목록 테스트',
          personalNote: '목록 조회 테스트용',
          categoryId: null,
          isPublic: false,
        },
      });
      bookmarkId = bookmark.id;
    });

    it('북마크 목록 조회 성공', async () => {
      const response = await request(app.server)
        .get('/bookmarks')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('bookmarks');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.bookmarks).toHaveLength(1);
      expect(response.body.data.bookmarks[0]).toMatchObject({
        personalTitle: '목록 테스트',
        personalNote: '목록 조회 테스트용',
        isPublic: false,
      });
    });

    it('페이지네이션 동작 확인', async () => {
      const response = await request(app.server)
        .get('/bookmarks?page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.pagination).toMatchObject({
        currentPage: 1,
        limit: 10,
        totalCount: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('카테고리 필터링 동작 확인', async () => {
      const response = await request(app.server)
        .get(`/bookmarks?categoryId=${categoryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bookmarks).toHaveLength(0); // categoryId가 null이므로 0개
    });

    it('검색 기능 동작 확인', async () => {
      const response = await request(app.server)
        .get('/bookmarks?search=목록')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bookmarks).toHaveLength(1);
    });

    it('인증 없이 요청 시 401 에러', async () => {
      const response = await request(app.server).get('/bookmarks').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /bookmarks/:id - 북마크 단일 조회', () => {
    let bookmarkId: string;

    beforeEach(async () => {
      // 테스트용 북마크 생성
      const websiteMetadata = await prisma.websiteMetadata.create({
        data: {
          url: 'https://test-single.com',
          title: '단일 조회 테스트',
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
      bookmarkId = bookmark.id;
    });

    it('북마크 단일 조회 성공', async () => {
      const response = await request(app.server)
        .get(`/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: bookmarkId,
        personalTitle: '단일 조회 테스트',
        personalNote: '단일 북마크 조회 테스트',
        isPublic: true,
        websiteMetadata: {
          url: 'https://test-single.com',
        },
        category: null,
      });
    });

    it('존재하지 않는 북마크 조회 시 404 에러', async () => {
      const response = await request(app.server)
        .get('/bookmarks/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BOOKMARK_NOT_FOUND');
    });

    it('인증 없이 요청 시 401 에러', async () => {
      const response = await request(app.server).get(`/bookmarks/${bookmarkId}`).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PUT /bookmarks/:id - 북마크 수정', () => {
    let bookmarkId: string;

    beforeEach(async () => {
      // 테스트용 북마크 생성
      const websiteMetadata = await prisma.websiteMetadata.create({
        data: {
          url: 'https://test-update.com',
          title: '수정 테스트',
        },
      });

      const bookmark = await prisma.bookmark.create({
        data: {
          userId,
          websiteMetadataId: websiteMetadata.id,
          personalTitle: '수정 전 제목',
          personalNote: '수정 전 노트',
          categoryId: null,
          isPublic: false,
        },
      });
      bookmarkId = bookmark.id;
    });

    it('북마크 수정 성공', async () => {
      const updateData = {
        personalTitle: '수정된 제목',
        personalNote: '수정된 노트',
        isPublic: true,
        tags: ['업데이트', '테스트'],
      };

      const response = await request(app.server)
        .put(`/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        personalTitle: '수정된 제목',
        personalNote: '수정된 노트',
        isPublic: true,
        tags: expect.arrayContaining([
          expect.objectContaining({
            tag: expect.objectContaining({
              name: '업데이트',
            }),
          }),
          expect.objectContaining({
            tag: expect.objectContaining({
              name: '테스트',
            }),
          }),
        ]),
      });
    });

    it('존재하지 않는 북마크 수정 시 404 에러', async () => {
      const updateData = {
        personalTitle: '수정 시도',
      };

      const response = await request(app.server)
        .put('/bookmarks/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BOOKMARK_NOT_FOUND');
    });

    it('인증 없이 요청 시 401 에러', async () => {
      const updateData = {
        personalTitle: '인증 없음',
      };

      const response = await request(app.server)
        .put(`/bookmarks/${bookmarkId}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('DELETE /bookmarks/:id - 북마크 삭제', () => {
    let bookmarkId: string;

    beforeEach(async () => {
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
          personalTitle: '삭제 테스트',
          personalNote: '삭제 테스트용 북마크',
          categoryId: null,
          isPublic: false,
        },
      });
      bookmarkId = bookmark.id;
    });

    it('북마크 삭제 성공 (소프트 삭제)', async () => {
      const response = await request(app.server)
        .delete(`/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('북마크가 성공적으로 삭제되었습니다.');

      // 소프트 삭제 확인
      const deletedBookmark = await prisma.bookmark.findUnique({
        where: { id: bookmarkId },
      });
      expect(deletedBookmark?.deletedAt).not.toBeNull();
    });

    it('존재하지 않는 북마크 삭제 시 404 에러', async () => {
      const response = await request(app.server)
        .delete('/bookmarks/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BOOKMARK_NOT_FOUND');
    });

    it('인증 없이 요청 시 401 에러', async () => {
      const response = await request(app.server).delete(`/bookmarks/${bookmarkId}`).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('사용자별 데이터 분리 테스트', () => {
    let otherUserToken: string;
    let otherUserId: string;
    let bookmarkId: string;

    beforeEach(async () => {
      // 다른 사용자 생성
      const hashedPassword = await hashPassword('password456');
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          password: hashedPassword,
          name: '다른 사용자',
        },
      });
      otherUserId = otherUser.id;

      otherUserToken = app.jwt.sign({
        userId: otherUser.id,
        email: otherUser.email,
      });

      // 첫 번째 사용자의 북마크 생성
      const websiteMetadata = await prisma.websiteMetadata.create({
        data: {
          url: 'https://test-separation.com',
          title: '분리 테스트',
        },
      });

      const bookmark = await prisma.bookmark.create({
        data: {
          userId,
          websiteMetadataId: websiteMetadata.id,
          personalTitle: '분리 테스트 북마크',
          personalNote: '사용자별 분리 테스트',
          categoryId: null,
          isPublic: false,
        },
      });
      bookmarkId = bookmark.id;
    });

    it('다른 사용자의 북마크 조회 시 404 에러', async () => {
      const response = await request(app.server)
        .get(`/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BOOKMARK_NOT_FOUND');
    });

    it('다른 사용자의 북마크 수정 시 404 에러', async () => {
      const updateData = {
        personalTitle: '다른 사용자 수정 시도',
      };

      const response = await request(app.server)
        .put(`/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BOOKMARK_NOT_FOUND');
    });

    it('다른 사용자의 북마크 삭제 시 404 에러', async () => {
      const response = await request(app.server)
        .delete(`/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BOOKMARK_NOT_FOUND');
    });
  });
});
