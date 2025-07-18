import { FastifyRequest, FastifyReply } from 'fastify';
import { TagService } from '../services/tag.service';
import { success, error } from '../utils/response';
import { AppError } from '../utils/error';

export class TagController {
  private tagService: TagService;

  constructor(tagService: TagService) {
    this.tagService = tagService;
  }

  async createTag(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const tagData = request.body as any;

      const tag = await this.tagService.createTag(userId, tagData);

      return reply.status(201).send(success(tag, '태그가 성공적으로 생성되었습니다'));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(error(err.message));
      }
      return reply.status(500).send(error('태그 생성 중 오류가 발생했습니다'));
    }
  }

  async getTags(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const queryParams = request.query as any;

      const result = await this.tagService.getTags(userId, queryParams);

      return reply.status(200).send(success(result, '태그 목록을 성공적으로 조회했습니다'));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(error(err.message));
      }
      return reply.status(500).send(error('태그 목록 조회 중 오류가 발생했습니다'));
    }
  }

  async getTagById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };

      const tag = await this.tagService.getTagById(userId, id);

      return reply.status(200).send(success(tag, '태그를 성공적으로 조회했습니다'));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(error(err.message));
      }
      return reply.status(500).send(error('태그 조회 중 오류가 발생했습니다'));
    }
  }

  async updateTag(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const tag = await this.tagService.updateTag(userId, id, updateData);

      return reply.status(200).send(success(tag, '태그가 성공적으로 수정되었습니다'));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(error(err.message));
      }
      return reply.status(500).send(error('태그 수정 중 오류가 발생했습니다'));
    }
  }

  async deleteTag(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };

      await this.tagService.deleteTag(userId, id);

      return reply.status(200).send(success(null, '태그가 성공적으로 삭제되었습니다'));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(error(err.message));
      }
      return reply.status(500).send(error('태그 삭제 중 오류가 발생했습니다'));
    }
  }

  async getTagWithBookmarks(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };

      const result = await this.tagService.getTagWithBookmarks(userId, id, page, limit);

      return reply
        .status(200)
        .send(success(result, '태그별 북마크 목록을 성공적으로 조회했습니다'));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(error(err.message));
      }
      return reply.status(500).send(error('태그별 북마크 조회 중 오류가 발생했습니다'));
    }
  }
}
