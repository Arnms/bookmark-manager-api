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
  }, categoryController.getCategories.bind(categoryController));

  // 카테고리 단일 조회
  app.get('/:id', {
    preHandler: requireAuth,
  }, categoryController.getCategoryById.bind(categoryController));

  // 카테고리 생성
  app.post('/', {
    preHandler: requireAuth,
  }, categoryController.createCategory.bind(categoryController));

  // 카테고리 수정
  app.put('/:id', {
    preHandler: requireAuth,
  }, categoryController.updateCategory.bind(categoryController));

  // 카테고리 삭제
  app.delete('/:id', {
    preHandler: requireAuth,
  }, categoryController.deleteCategory.bind(categoryController));
}