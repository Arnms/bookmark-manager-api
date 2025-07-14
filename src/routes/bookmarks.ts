/**
 * 북마크 API 라우트
 * 북마크 CRUD 기능과 검색 기능을 제공하는 엔드포인트
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/database';
import { success, error } from '../utils/response';

// === 스키마 검증 정의 ===

// 북마크 생성 스키마
const createBookmarkSchema = z.object({
  url: z.string().url('유효한 URL을 입력해주세요.'),
  personalTitle: z.string().optional(),
  personalNote: z.string().optional(),
  categoryId: z.string().optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

// 북마크 수정 스키마
const updateBookmarkSchema = z.object({
  personalTitle: z.string().optional(),
  personalNote: z.string().optional(),
  categoryId: z.string().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

// 북마크 조회 쿼리 스키마
const getBookmarksSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  categoryId: z.string().optional(),
  search: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// === 유틸리티 함수 ===

/**
 * 웹사이트 메타데이터 조회 또는 생성
 */
async function getOrCreateWebsiteMetadata(url: string) {
  let metadata = await prisma.websiteMetadata.findUnique({
    where: { url },
  });

  if (!metadata) {
    // 기본 메타데이터로 생성 (향후 웹 스크래핑 기능 추가 예정)
    metadata = await prisma.websiteMetadata.create({
      data: {
        url,
        title: null,
        description: null,
        favicon: null,
        image: null,
      },
    });
  }

  return metadata;
}

/**
 * 사용자 JWT 인증 미들웨어
 */
async function authenticate(request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send(error('인증이 필요합니다.', 'UNAUTHORIZED'));
  }
}

export default async function bookmarkRoutes(fastify: FastifyInstance) {
  // === 북마크 생성 API ===
  fastify.post('/', {
    preHandler: authenticate,
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.userId;
      const { url, personalTitle, personalNote, categoryId, isPublic, tags } = 
        createBookmarkSchema.parse(request.body);

      // 웹사이트 메타데이터 조회 또는 생성
      const websiteMetadata = await getOrCreateWebsiteMetadata(url);

      // 북마크 생성
      const bookmark = await prisma.bookmark.create({
        data: {
          userId,
          websiteMetadataId: websiteMetadata.id,
          personalTitle,
          personalNote,
          categoryId,
          isPublic,
        },
        include: {
          websiteMetadata: true,
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // 태그 연결 처리
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          // 태그 조회 또는 생성
          let tag = await prisma.tag.findUnique({
            where: {
              userId_name: {
                userId,
                name: tagName,
              },
            },
          });

          if (!tag) {
            tag = await prisma.tag.create({
              data: {
                userId,
                name: tagName,
              },
            });
          }

          // 북마크-태그 연결
          await prisma.bookmarkTag.create({
            data: {
              bookmarkId: bookmark.id,
              tagId: tag.id,
            },
          });
        }
      }

      // 생성된 북마크 재조회 (태그 포함)
      const createdBookmark = await prisma.bookmark.findUnique({
        where: { id: bookmark.id },
        include: {
          websiteMetadata: true,
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      reply.status(201).send(success(createdBookmark, '북마크가 성공적으로 생성되었습니다.'));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '입력 데이터가 유효하지 않습니다.',
            details: error.errors,
          },
          timestamp: new Date().toISOString(),
        });
      }

      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '서버 오류가 발생했습니다.',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // === 북마크 목록 조회 API ===
  fastify.get('/', {
    preHandler: authenticate,
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.userId;
      const { page, limit, categoryId, search, isPublic } = 
        getBookmarksSchema.parse(request.query);

      const skip = (page - 1) * limit;

      // 검색 조건 구성
      const whereCondition: any = {
        userId,
        deletedAt: null,
      };

      if (categoryId) {
        whereCondition.categoryId = categoryId;
      }

      if (isPublic !== undefined) {
        whereCondition.isPublic = isPublic;
      }

      // 검색 기능 (제목, URL, 노트, 태그)
      if (search) {
        whereCondition.OR = [
          { personalTitle: { contains: search } },
          { personalNote: { contains: search } },
          { websiteMetadata: { title: { contains: search } } },
          { websiteMetadata: { url: { contains: search } } },
          { tags: { some: { tag: { name: { contains: search } } } } },
        ];
      }

      // 전체 개수 조회
      const totalCount = await prisma.bookmark.count({
        where: whereCondition,
      });

      // 북마크 목록 조회
      const bookmarks = await prisma.bookmark.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          websiteMetadata: true,
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      const totalPages = Math.ceil(totalCount / limit);

      reply.send(success({
        bookmarks,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }, '북마크 목록 조회 성공'));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '쿼리 파라미터가 유효하지 않습니다.',
            details: error.errors,
          },
          timestamp: new Date().toISOString(),
        });
      }

      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '서버 오류가 발생했습니다.',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // === 북마크 단일 조회 API ===
  fastify.get('/:id', {
    preHandler: authenticate,
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };

      const bookmark = await prisma.bookmark.findFirst({
        where: {
          id,
          userId,
          deletedAt: null,
        },
        include: {
          websiteMetadata: true,
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      if (!bookmark) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '북마크를 찾을 수 없습니다.',
          },
          timestamp: new Date().toISOString(),
        });
      }

      reply.send(success(bookmark, '북마크 조회 성공'));
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '서버 오류가 발생했습니다.',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // === 북마크 수정 API ===
  fastify.put('/:id', {
    preHandler: authenticate,
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      const { personalTitle, personalNote, categoryId, isPublic, tags } = 
        updateBookmarkSchema.parse(request.body);

      // 북마크 존재 확인
      const existingBookmark = await prisma.bookmark.findFirst({
        where: {
          id,
          userId,
          deletedAt: null,
        },
      });

      if (!existingBookmark) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '북마크를 찾을 수 없습니다.',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 북마크 업데이트
      const updatedBookmark = await prisma.bookmark.update({
        where: { id },
        data: {
          personalTitle,
          personalNote,
          categoryId,
          isPublic,
        },
        include: {
          websiteMetadata: true,
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // 태그 업데이트 처리
      if (tags !== undefined) {
        // 기존 태그 연결 모두 삭제
        await prisma.bookmarkTag.deleteMany({
          where: { bookmarkId: id },
        });

        // 새로운 태그 연결
        if (tags.length > 0) {
          for (const tagName of tags) {
            let tag = await prisma.tag.findUnique({
              where: {
                userId_name: {
                  userId,
                  name: tagName,
                },
              },
            });

            if (!tag) {
              tag = await prisma.tag.create({
                data: {
                  userId,
                  name: tagName,
                },
              });
            }

            await prisma.bookmarkTag.create({
              data: {
                bookmarkId: id,
                tagId: tag.id,
              },
            });
          }
        }
      }

      // 업데이트된 북마크 재조회
      const finalBookmark = await prisma.bookmark.findUnique({
        where: { id },
        include: {
          websiteMetadata: true,
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      reply.send(success(finalBookmark, '북마크가 성공적으로 수정되었습니다.'));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '입력 데이터가 유효하지 않습니다.',
            details: error.errors,
          },
          timestamp: new Date().toISOString(),
        });
      }

      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '서버 오류가 발생했습니다.',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // === 북마크 삭제 API (소프트 삭제) ===
  fastify.delete('/:id', {
    preHandler: authenticate,
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };

      // 북마크 존재 확인
      const existingBookmark = await prisma.bookmark.findFirst({
        where: {
          id,
          userId,
          deletedAt: null,
        },
      });

      if (!existingBookmark) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '북마크를 찾을 수 없습니다.',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 소프트 삭제 처리
      await prisma.bookmark.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      reply.send(success(null, '북마크가 성공적으로 삭제되었습니다.'));
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '서버 오류가 발생했습니다.',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });
}