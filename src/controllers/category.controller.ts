/**
 * 카테고리 컨트롤러
 * 카테고리 관련 HTTP 요청 처리
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { categoryService, CategoryError } from '../services/category.service';
import { 
  CreateCategoryRequest, 
  UpdateCategoryRequest, 
  GetCategoriesQuery,
  CategoryParamsRequest 
} from '../schemas/category.schema';
import { success, error } from '../utils/response';

// === 카테고리 컨트롤러 클래스 ===
export class CategoryController {
  /**
   * 카테고리 목록 조회
   */
  async getCategories(
    request: FastifyRequest<{ Querystring: GetCategoriesQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { page, limit } = request.query;
      const userId = (request.user as any).userId;
      const skip = (page - 1) * limit;

      const { categories, total } = await categoryService.getCategoriesByUserId(userId, skip, limit);
      const totalPages = Math.ceil(total / limit);

      return reply.code(200).send(success({
        categories,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      }));
    } catch (err) {
      return reply.code(500).send(error('카테고리 목록을 불러오는 중 오류가 발생했습니다.'));
    }
  }

  /**
   * 카테고리 단일 조회
   */
  async getCategoryById(
    request: FastifyRequest<{ Params: CategoryParamsRequest }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const userId = (request.user as any).userId;

      const category = await categoryService.getCategoryById(id, userId);

      if (!category) {
        return reply.code(404).send(error('카테고리를 찾을 수 없습니다.'));
      }

      return reply.code(200).send(success(category));
    } catch (err) {
      return reply.code(500).send(error('카테고리 정보를 불러오는 중 오류가 발생했습니다.'));
    }
  }

  /**
   * 카테고리 생성
   */
  async createCategory(
    request: FastifyRequest<{ Body: CreateCategoryRequest }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any).userId;
      const category = await categoryService.createCategory(userId, request.body);

      return reply.code(201).send(success(category));
    } catch (err: any) {
      if (err.code === 'P2002') {
        return reply.code(400).send(error('이미 존재하는 카테고리명입니다.'));
      }
      return reply.code(500).send(error('카테고리 생성 중 오류가 발생했습니다.'));
    }
  }

  /**
   * 카테고리 수정
   */
  async updateCategory(
    request: FastifyRequest<{ Params: CategoryParamsRequest; Body: UpdateCategoryRequest }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const userId = (request.user as any).userId;

      const category = await categoryService.updateCategory(id, userId, request.body);

      return reply.code(200).send(success(category));
    } catch (err: any) {
      if (err instanceof CategoryError) {
        return reply.code(err.statusCode).send(error(err.message));
      }
      if (err.code === 'P2002') {
        return reply.code(400).send(error('이미 존재하는 카테고리명입니다.'));
      }
      return reply.code(500).send(error('카테고리 수정 중 오류가 발생했습니다.'));
    }
  }

  /**
   * 카테고리 삭제
   */
  async deleteCategory(
    request: FastifyRequest<{ Params: CategoryParamsRequest }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const userId = (request.user as any).userId;

      await categoryService.deleteCategory(id, userId);

      return reply.code(200).send(success(null, '카테고리가 성공적으로 삭제되었습니다.'));
    } catch (err: any) {
      if (err instanceof CategoryError) {
        return reply.code(err.statusCode).send(error(err.message));
      }
      return reply.code(500).send(error('카테고리 삭제 중 오류가 발생했습니다.'));
    }
  }
}

// === 싱글톤 인스턴스 ===
export const categoryController = new CategoryController();