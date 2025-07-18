/**
 * 북마크 API 라우트
 * 북마크 CRUD 기능과 검색 기능을 제공하는 엔드포인트
 */

import { FastifyInstance } from 'fastify';
import { bookmarkController } from '../controllers/bookmark.controller';
import { requireAuth } from '../middleware/auth';

export default async function bookmarkRoutes(fastify: FastifyInstance) {
  // === 북마크 생성 API ===
  fastify.post(
    '/',
    {
      preHandler: requireAuth,
    },
    bookmarkController.createBookmark.bind(bookmarkController)
  );

  // === 북마크 목록 조회 API ===
  fastify.get(
    '/',
    {
      preHandler: requireAuth,
    },
    bookmarkController.getBookmarks.bind(bookmarkController)
  );

  // === 북마크 단일 조회 API ===
  fastify.get(
    '/:id',
    {
      preHandler: requireAuth,
    },
    bookmarkController.getBookmarkById.bind(bookmarkController)
  );

  // === 북마크 수정 API ===
  fastify.put(
    '/:id',
    {
      preHandler: requireAuth,
    },
    bookmarkController.updateBookmark.bind(bookmarkController)
  );

  // === 북마크 삭제 API (소프트 삭제) ===
  fastify.delete(
    '/:id',
    {
      preHandler: requireAuth,
    },
    bookmarkController.deleteBookmark.bind(bookmarkController)
  );

  // === 북마크에 태그 추가 API ===
  fastify.post(
    '/:id/tags',
    {
      preHandler: requireAuth,
    },
    bookmarkController.addTagsToBookmark.bind(bookmarkController)
  );

  // === 북마크에서 태그 제거 API ===
  fastify.delete(
    '/:id/tags/:tagId',
    {
      preHandler: requireAuth,
    },
    bookmarkController.removeTagFromBookmark.bind(bookmarkController)
  );

  // === 북마크 카테고리 변경 API ===
  fastify.patch(
    '/:id/category',
    {
      preHandler: requireAuth,
    },
    bookmarkController.updateBookmarkCategory.bind(bookmarkController)
  );
}
