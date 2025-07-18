import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth';
import { categoryController } from '../controllers/category.controller';
import { 
  createCategorySchema, 
  updateCategorySchema, 
  getCategoriesSchema,
  categoryParamsSchema 
} from '../schemas/category.schema';

export default async function categoriesRoutes(app: FastifyInstance) {
  // 카테고리 목록 조회
  app.get('/', {
    preHandler: requireAuth,
    schema: {
      querystring: getCategoriesSchema,
    },
  }, categoryController.getCategories.bind(categoryController));

  // 카테고리 단일 조회
  app.get('/:id', {
    preHandler: requireAuth,
    schema: {
      params: categoryParamsSchema,
    },
  }, categoryController.getCategoryById.bind(categoryController));

  // 카테고리 생성
  app.post('/', {
    preHandler: requireAuth,
    schema: {
      body: createCategorySchema,
    },
  }, categoryController.createCategory.bind(categoryController));

  // 카테고리 수정
  app.put('/:id', {
    preHandler: requireAuth,
    schema: {
      params: categoryParamsSchema,
      body: updateCategorySchema,
    },
  }, categoryController.updateCategory.bind(categoryController));

  // 카테고리 삭제
  app.delete('/:id', {
    preHandler: requireAuth,
    schema: {
      params: categoryParamsSchema,
    },
  }, categoryController.deleteCategory.bind(categoryController));
}