/**
 * 북마크 API 라우트
 * 북마크 CRUD 기능과 검색 기능을 제공하는 엔드포인트
 */

import { FastifyInstance } from 'fastify';
import { bookmarkController } from '../controllers/bookmark.controller';

/**
 * 사용자 JWT 인증 미들웨어
 */
async function authenticate(request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ 
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '인증이 필요합니다.'
      },
      timestamp: new Date().toISOString(),
    });
  }
}

export default async function bookmarkRoutes(fastify: FastifyInstance) {
  // === 북마크 생성 API ===
  fastify.post(
    '/',
    {
      preHandler: authenticate,
    },
    bookmarkController.createBookmark.bind(bookmarkController)
  );

  // === 북마크 목록 조회 API ===
  fastify.get(
    '/',
    {
      preHandler: authenticate,
    },
    bookmarkController.getBookmarks.bind(bookmarkController)
  );

  // === 북마크 단일 조회 API ===
  fastify.get(
    '/:id',
    {
      preHandler: authenticate,
    },
    bookmarkController.getBookmarkById.bind(bookmarkController)
  );

  // === 북마크 수정 API ===
  fastify.put(
    '/:id',
    {
      preHandler: authenticate,
    },
    bookmarkController.updateBookmark.bind(bookmarkController)
  );

  // === 북마크 삭제 API (소프트 삭제) ===
  fastify.delete(
    '/:id',
    {
      preHandler: authenticate,
    },
    bookmarkController.deleteBookmark.bind(bookmarkController)
  );

  // === 북마크에 태그 추가 API ===
  fastify.post(
    '/:id/tags',
    {
      preHandler: authenticate,
    },
    bookmarkController.addTagsToBookmark.bind(bookmarkController)
  );

  // === 북마크에서 태그 제거 API ===
  fastify.delete(
    '/:id/tags/:tagId',
    {
      preHandler: authenticate,
    },
    bookmarkController.removeTagFromBookmark.bind(bookmarkController)
  );

  // === 북마크 카테고리 변경 API ===
  fastify.patch(
    '/:id/category',
    {
      preHandler: authenticate,
    },
    bookmarkController.updateBookmarkCategory.bind(bookmarkController)
  );
}
