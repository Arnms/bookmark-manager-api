/**
 * 북마크 서비스
 * 북마크 CRUD, 검색, 태그 관리 등의 비즈니스 로직 처리
 */

import { prisma } from '../config/database';
import {
  CreateBookmarkRequest,
  UpdateBookmarkRequest,
  GetBookmarksQuery,
  AddTagsToBookmarkRequest,
  UpdateBookmarkCategoryRequest,
} from '../schemas/bookmark.schema';

// === 응답 타입 정의 ===
export interface BookmarkResponse {
  id: string;
  personalTitle: string | null;
  personalNote: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  websiteMetadata: {
    id: string;
    url: string;
    title: string | null;
    description: string | null;
    favicon: string | null;
    image: string | null;
  };
  category: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  tags: {
    tagId: string;
    bookmarkId: string;
    createdAt: Date;
    tag: {
      id: string;
      name: string;
      userId: string;
      createdAt: Date;
      updatedAt: Date;
    };
  }[];
}

export interface BookmarkListResponse {
  bookmarks: BookmarkResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// === 에러 타입 정의 ===
export class BookmarkError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'BookmarkError';
  }
}

// === 북마크 서비스 클래스 ===
export class BookmarkService {
  /**
   * 웹사이트 메타데이터 조회 또는 생성
   */
  private async getOrCreateWebsiteMetadata(url: string) {
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
   * 북마크 생성
   */
  async createBookmark(userId: string, data: CreateBookmarkRequest): Promise<BookmarkResponse> {
    const { url, personalTitle, personalNote, categoryId, isPublic, tags } = data;

    // 웹사이트 메타데이터 조회 또는 생성
    const websiteMetadata = await this.getOrCreateWebsiteMetadata(url);

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

    if (!createdBookmark) {
      throw new BookmarkError('북마크 생성에 실패했습니다.', 'BOOKMARK_CREATION_FAILED', 500);
    }

    return createdBookmark;
  }

  /**
   * 북마크 목록 조회
   */
  async getBookmarks(userId: string, query: GetBookmarksQuery): Promise<BookmarkListResponse> {
    const { page, limit, categoryId, search, isPublic } = query;
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

    return {
      bookmarks,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * 북마크 단일 조회
   */
  async getBookmarkById(userId: string, bookmarkId: string): Promise<BookmarkResponse> {
    const bookmark = await prisma.bookmark.findFirst({
      where: {
        id: bookmarkId,
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
      throw new BookmarkError('북마크를 찾을 수 없습니다.', 'BOOKMARK_NOT_FOUND', 404);
    }

    return bookmark;
  }

  /**
   * 북마크 수정
   */
  async updateBookmark(
    userId: string,
    bookmarkId: string,
    data: UpdateBookmarkRequest,
  ): Promise<BookmarkResponse> {
    const { personalTitle, personalNote, categoryId, isPublic, tags } = data;

    // 북마크 존재 확인
    const existingBookmark = await prisma.bookmark.findFirst({
      where: {
        id: bookmarkId,
        userId,
        deletedAt: null,
      },
    });

    if (!existingBookmark) {
      throw new BookmarkError('북마크를 찾을 수 없습니다.', 'BOOKMARK_NOT_FOUND', 404);
    }

    // 북마크 업데이트
    await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: {
        personalTitle,
        personalNote,
        categoryId,
        isPublic,
      },
    });

    // 태그 업데이트 처리
    if (tags !== undefined) {
      // 기존 태그 연결 모두 삭제
      await prisma.bookmarkTag.deleteMany({
        where: { bookmarkId },
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
              bookmarkId,
              tagId: tag.id,
            },
          });
        }
      }
    }

    // 업데이트된 북마크 재조회
    const updatedBookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
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

    if (!updatedBookmark) {
      throw new BookmarkError('북마크 수정에 실패했습니다.', 'BOOKMARK_UPDATE_FAILED', 500);
    }

    return updatedBookmark;
  }

  /**
   * 북마크 삭제 (소프트 삭제)
   */
  async deleteBookmark(userId: string, bookmarkId: string): Promise<void> {
    // 북마크 존재 확인
    const existingBookmark = await prisma.bookmark.findFirst({
      where: {
        id: bookmarkId,
        userId,
        deletedAt: null,
      },
    });

    if (!existingBookmark) {
      throw new BookmarkError('북마크를 찾을 수 없습니다.', 'BOOKMARK_NOT_FOUND', 404);
    }

    // 소프트 삭제 처리
    await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * 북마크에 태그 추가
   */
  async addTagsToBookmark(
    userId: string,
    bookmarkId: string,
    data: AddTagsToBookmarkRequest,
  ): Promise<void> {
    const { tagIds } = data;

    // 북마크 존재 확인
    const existingBookmark = await prisma.bookmark.findFirst({
      where: {
        id: bookmarkId,
        userId,
        deletedAt: null,
      },
    });

    if (!existingBookmark) {
      throw new BookmarkError('북마크를 찾을 수 없습니다.', 'BOOKMARK_NOT_FOUND', 404);
    }

    // 태그 소유권 확인
    const userTags = await prisma.tag.findMany({
      where: {
        id: { in: tagIds },
        userId,
      },
    });

    if (userTags.length !== tagIds.length) {
      throw new BookmarkError('유효하지 않은 태그가 포함되어 있습니다.', 'INVALID_TAGS', 400);
    }

    // 태그 연결 (중복 방지)
    for (const tagId of tagIds) {
      await prisma.bookmarkTag.upsert({
        where: {
          bookmarkId_tagId: {
            bookmarkId,
            tagId,
          },
        },
        update: {},
        create: {
          bookmarkId,
          tagId,
        },
      });
    }
  }

  /**
   * 북마크에서 태그 제거
   */
  async removeTagFromBookmark(userId: string, bookmarkId: string, tagId: string): Promise<void> {
    // 북마크 존재 확인
    const existingBookmark = await prisma.bookmark.findFirst({
      where: {
        id: bookmarkId,
        userId,
        deletedAt: null,
      },
    });

    if (!existingBookmark) {
      throw new BookmarkError('북마크를 찾을 수 없습니다.', 'BOOKMARK_NOT_FOUND', 404);
    }

    // 태그 연결 삭제
    await prisma.bookmarkTag.deleteMany({
      where: {
        bookmarkId,
        tagId,
      },
    });
  }

  /**
   * 북마크 카테고리 변경
   */
  async updateBookmarkCategory(
    userId: string,
    bookmarkId: string,
    data: UpdateBookmarkCategoryRequest,
  ): Promise<void> {
    const { categoryId } = data;

    // 북마크 존재 확인
    const existingBookmark = await prisma.bookmark.findFirst({
      where: {
        id: bookmarkId,
        userId,
        deletedAt: null,
      },
    });

    if (!existingBookmark) {
      throw new BookmarkError('북마크를 찾을 수 없습니다.', 'BOOKMARK_NOT_FOUND', 404);
    }

    // 카테고리 소유권 확인 (카테고리가 설정되는 경우)
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId,
        },
      });

      if (!category) {
        throw new BookmarkError('유효하지 않은 카테고리입니다.', 'INVALID_CATEGORY', 400);
      }
    }

    // 카테고리 변경
    await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: { categoryId },
    });
  }
}

// === 싱글톤 인스턴스 ===
export const bookmarkService = new BookmarkService();
