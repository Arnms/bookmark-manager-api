import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/database';
import { requireAuth } from '../middleware/auth';
import { success, error } from '../utils/response';

const CreateCategorySchema = z.object({
  name: z.string().min(1, '카테고리명은 필수입니다').max(100, '카테고리명은 100자 이내여야 합니다'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, '유효한 hex 색상 코드를 입력해주세요').optional(),
});

const UpdateCategorySchema = CreateCategorySchema.partial();

const GetCategoriesQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional().default('10'),
});

export default async function categoriesRoutes(app: FastifyInstance) {
  // 인증 미들웨어 적용
  app.addHook('onRequest', requireAuth);

  // 카테고리 목록 조회
  app.get<{
    Querystring: z.infer<typeof GetCategoriesQuerySchema>;
  }>('/', async (request, reply) => {
    try {
      const queryResult = GetCategoriesQuerySchema.parse(request.query);
      const { page, limit } = queryResult;
      const userId = (request.user as any).userId;
      const skip = (page - 1) * limit;

      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { bookmarks: true },
            },
          },
        }),
        prisma.category.count({
          where: { userId },
        }),
      ]);

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
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.code(400).send(error('쿼리 파라미터가 유효하지 않습니다'));
      }
      return reply.code(500).send(error('카테고리 목록을 불러오는 중 오류가 발생했습니다'));
    }
  });

  // 카테고리 단일 조회
  app.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const userId = (request.user as any).userId;

      const category = await prisma.category.findFirst({
        where: { id, userId },
        include: {
          _count: {
            select: { bookmarks: true },
          },
        },
      });

      if (!category) {
        return reply.code(404).send(error('카테고리를 찾을 수 없습니다'));
      }

      return reply.code(200).send(success(category));
    } catch (err) {
      return reply.code(500).send(error('카테고리 정보를 불러오는 중 오류가 발생했습니다'));
    }
  });

  // 카테고리 생성
  app.post<{
    Body: z.infer<typeof CreateCategorySchema>;
  }>('/', async (request, reply) => {
    try {
      const { name, description, color } = CreateCategorySchema.parse(request.body);
      const userId = (request.user as any).userId;
      

      const category = await prisma.category.create({
        data: {
          name,
          description,
          color,
          userId,
        },
      });

      return reply.code(201).send(success(category));
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.code(400).send(error('입력 데이터가 유효하지 않습니다'));
      }
      if (err.code === 'P2002') {
        return reply.code(400).send(error('이미 존재하는 카테고리명입니다'));
      }
      return reply.code(500).send(error('카테고리 생성 중 오류가 발생했습니다'));
    }
  });

  // 카테고리 수정
  app.put<{
    Params: { id: string };
    Body: z.infer<typeof UpdateCategorySchema>;
  }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const userId = (request.user as any).userId;
      const updateData = UpdateCategorySchema.parse(request.body);

      const existingCategory = await prisma.category.findFirst({
        where: { id, userId },
      });

      if (!existingCategory) {
        return reply.code(404).send(error('카테고리를 찾을 수 없습니다'));
      }

      const category = await prisma.category.update({
        where: { id },
        data: updateData,
      });

      return reply.code(200).send(success(category));
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.code(400).send(error('입력 데이터가 유효하지 않습니다'));
      }
      if (err.code === 'P2002') {
        return reply.code(400).send(error('이미 존재하는 카테고리명입니다'));
      }
      return reply.code(500).send(error('카테고리 수정 중 오류가 발생했습니다'));
    }
  });

  // 카테고리 삭제
  app.delete<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const userId = (request.user as any).userId;

      const existingCategory = await prisma.category.findFirst({
        where: { id, userId },
      });

      if (!existingCategory) {
        return reply.code(404).send(error('카테고리를 찾을 수 없습니다'));
      }

      await prisma.category.delete({
        where: { id },
      });

      return reply.code(200).send(success(null, '카테고리가 성공적으로 삭제되었습니다'));
    } catch (err) {
      return reply.code(500).send(error('카테고리 삭제 중 오류가 발생했습니다'));
    }
  });
}