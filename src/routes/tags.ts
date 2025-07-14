import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/database';
import { requireAuth } from '../middleware/auth';
import { success, error } from '../utils/response';

const CreateTagSchema = z.object({
  name: z.string().min(1, '태그명은 필수입니다').max(50, '태그명은 50자 이내여야 합니다'),
});

const UpdateTagSchema = CreateTagSchema.partial();

const GetTagsQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional().default('10'),
  search: z.string().optional(),
});

export default async function tagsRoutes(app: FastifyInstance) {
  // 인증 미들웨어 적용
  app.addHook('onRequest', requireAuth);

  // 태그 목록 조회
  app.get<{
    Querystring: z.infer<typeof GetTagsQuerySchema>;
  }>('/', async (request, reply) => {
    try {
      const queryResult = GetTagsQuerySchema.parse(request.query);
      const { page, limit, search } = queryResult;
      const userId = (request.user as any).userId;
      const skip = (page - 1) * limit;

      const where = {
        userId,
        ...(search && {
          name: {
            contains: search,
          },
        }),
      };

      const [tags, total] = await Promise.all([
        prisma.tag.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { bookmarks: true },
            },
          },
        }),
        prisma.tag.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.code(200).send(success({
        tags,
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
      return reply.code(500).send(error('태그 목록을 불러오는 중 오류가 발생했습니다'));
    }
  });

  // 태그 단일 조회
  app.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const userId = (request.user as any).userId;

      const tag = await prisma.tag.findFirst({
        where: { id, userId },
        include: {
          _count: {
            select: { bookmarks: true },
          },
        },
      });

      if (!tag) {
        return reply.code(404).send(error('태그를 찾을 수 없습니다'));
      }

      return reply.code(200).send(success(tag));
    } catch (err) {
      return reply.code(500).send(error('태그 정보를 불러오는 중 오류가 발생했습니다'));
    }
  });

  // 태그 생성
  app.post<{
    Body: z.infer<typeof CreateTagSchema>;
  }>('/', async (request, reply) => {
    try {
      const { name } = CreateTagSchema.parse(request.body);
      const userId = (request.user as any).userId;

      const tag = await prisma.tag.create({
        data: {
          name,
          userId,
        },
      });

      return reply.code(201).send(success(tag));
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.code(400).send(error('입력 데이터가 유효하지 않습니다'));
      }
      if (err.code === 'P2002') {
        return reply.code(400).send(error('이미 존재하는 태그명입니다'));
      }
      return reply.code(500).send(error('태그 생성 중 오류가 발생했습니다'));
    }
  });

  // 태그 수정
  app.put<{
    Params: { id: string };
    Body: z.infer<typeof UpdateTagSchema>;
  }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const userId = (request.user as any).userId;
      const updateData = UpdateTagSchema.parse(request.body);

      const existingTag = await prisma.tag.findFirst({
        where: { id, userId },
      });

      if (!existingTag) {
        return reply.code(404).send(error('태그를 찾을 수 없습니다'));
      }

      const tag = await prisma.tag.update({
        where: { id },
        data: updateData,
      });

      return reply.code(200).send(success(tag));
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.code(400).send(error('입력 데이터가 유효하지 않습니다'));
      }
      if (err.code === 'P2002') {
        return reply.code(400).send(error('이미 존재하는 태그명입니다'));
      }
      return reply.code(500).send(error('태그 수정 중 오류가 발생했습니다'));
    }
  });

  // 태그 삭제
  app.delete<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const userId = (request.user as any).userId;

      const existingTag = await prisma.tag.findFirst({
        where: { id, userId },
      });

      if (!existingTag) {
        return reply.code(404).send(error('태그를 찾을 수 없습니다'));
      }

      await prisma.tag.delete({
        where: { id },
      });

      return reply.code(200).send(success(null, '태그가 성공적으로 삭제되었습니다'));
    } catch (err) {
      return reply.code(500).send(error('태그 삭제 중 오류가 발생했습니다'));
    }
  });

  // 태그별 북마크 목록 조회
  app.get<{
    Params: { id: string };
    Querystring: z.infer<typeof GetTagsQuerySchema>;
  }>('/:id/bookmarks', async (request, reply) => {
    try {
      const { id } = request.params;
      const queryResult = GetTagsQuerySchema.parse(request.query);
      const { page, limit } = queryResult;
      const userId = (request.user as any).userId;
      const skip = (page - 1) * limit;

      const tag = await prisma.tag.findFirst({
        where: { id, userId },
        select: { id: true, name: true },
      });

      if (!tag) {
        return reply.code(404).send(error('태그를 찾을 수 없습니다'));
      }

      const [bookmarkTags, total] = await Promise.all([
        prisma.bookmarkTag.findMany({
          where: {
            tagId: id,
            bookmark: {
              userId,
              deletedAt: null,
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            bookmark: {
              include: {
                websiteMetadata: {
                  select: {
                    url: true,
                    title: true,
                    description: true,
                    favicon: true,
                  },
                },
              },
            },
          },
        }),
        prisma.bookmarkTag.count({
          where: {
            tagId: id,
            bookmark: {
              userId,
              deletedAt: null,
            },
          },
        }),
      ]);

      const bookmarks = bookmarkTags.map(bt => bt.bookmark);
      const totalPages = Math.ceil(total / limit);

      return reply.code(200).send(success({
        tag,
        bookmarks,
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
      return reply.code(500).send(error('태그별 북마크 목록을 불러오는 중 오류가 발생했습니다'));
    }
  });
}