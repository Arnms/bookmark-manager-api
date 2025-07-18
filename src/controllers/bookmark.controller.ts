/**
 * 북마크 컨트롤러
 * 북마크 관련 HTTP 요청/응답 처리
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { bookmarkService, BookmarkError } from '../services/bookmark.service';
import {
  createBookmarkSchema,
  updateBookmarkSchema,
  getBookmarksSchema,
  addTagsToBookmarkSchema,
  updateBookmarkCategorySchema,
} from '../schemas/bookmark.schema';
import { success, error } from '../utils/response';

// === 북마크 컨트롤러 클래스 ===
export class BookmarkController {
  /**
   * 북마크 생성
   */
  async createBookmark(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const bookmarkData = createBookmarkSchema.parse(request.body);

      const bookmark = await bookmarkService.createBookmark(userId, bookmarkData);

      return reply.status(201).send(success(bookmark, '북마크가 성공적으로 생성되었습니다.'));
    } catch (error) {
      return this.handleError(error, reply, request.server.log);
    }
  }

  /**
   * 북마크 목록 조회
   */
  async getBookmarks(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const query = getBookmarksSchema.parse(request.query);

      const result = await bookmarkService.getBookmarks(userId, query);

      return reply.status(200).send({
        success: true,
        message: '북마크 목록 조회 성공',
        data: result,
      });
    } catch (error) {
      return this.handleError(error, reply, request.server.log);
    }
  }

  /**
   * 북마크 단일 조회
   */
  async getBookmarkById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };

      const bookmark = await bookmarkService.getBookmarkById(userId, id);

      return reply.status(200).send({
        success: true,
        message: '북마크 조회 성공',
        data: bookmark,
      });
    } catch (error) {
      return this.handleError(error, reply, request.server.log);
    }
  }

  /**
   * 북마크 수정
   */
  async updateBookmark(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      const updateData = updateBookmarkSchema.parse(request.body);

      const bookmark = await bookmarkService.updateBookmark(userId, id, updateData);

      return reply.status(200).send({
        success: true,
        message: '북마크가 성공적으로 수정되었습니다.',
        data: bookmark,
      });
    } catch (error) {
      return this.handleError(error, reply, request.server.log);
    }
  }

  /**
   * 북마크 삭제
   */
  async deleteBookmark(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };

      await bookmarkService.deleteBookmark(userId, id);

      return reply.status(200).send({
        success: true,
        message: '북마크가 성공적으로 삭제되었습니다.',
        data: null,
      });
    } catch (error) {
      return this.handleError(error, reply, request.server.log);
    }
  }

  /**
   * 북마크에 태그 추가
   */
  async addTagsToBookmark(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      const tagData = addTagsToBookmarkSchema.parse(request.body);

      await bookmarkService.addTagsToBookmark(userId, id, tagData);

      return reply.status(200).send({
        success: true,
        message: '태그가 성공적으로 추가되었습니다.',
        data: null,
      });
    } catch (error) {
      return this.handleError(error, reply, request.server.log);
    }
  }

  /**
   * 북마크에서 태그 제거
   */
  async removeTagFromBookmark(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const { id, tagId } = request.params as { id: string; tagId: string };

      await bookmarkService.removeTagFromBookmark(userId, id, tagId);

      return reply.status(200).send({
        success: true,
        message: '태그가 성공적으로 제거되었습니다.',
        data: null,
      });
    } catch (error) {
      return this.handleError(error, reply, request.server.log);
    }
  }

  /**
   * 북마크 카테고리 변경
   */
  async updateBookmarkCategory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      const categoryData = updateBookmarkCategorySchema.parse(request.body);

      await bookmarkService.updateBookmarkCategory(userId, id, categoryData);

      return reply.status(200).send({
        success: true,
        message: '카테고리가 성공적으로 변경되었습니다.',
        data: null,
      });
    } catch (error) {
      return this.handleError(error, reply, request.server.log);
    }
  }

  /**
   * 에러 처리 헬퍼 메서드
   */
  private handleError(err: unknown, reply: FastifyReply, logger: any) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send(error('입력 데이터가 유효하지 않습니다.', 'VALIDATION_ERROR'));
    }

    if (err instanceof BookmarkError) {
      return reply.status(err.statusCode).send(error(err.message, err.code));
    }

    logger.error(err);
    return reply.status(500).send(error('서버 오류가 발생했습니다.', 'INTERNAL_SERVER_ERROR'));
  }
}

// === 싱글톤 인스턴스 ===
export const bookmarkController = new BookmarkController();
