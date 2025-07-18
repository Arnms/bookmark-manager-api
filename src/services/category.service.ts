/**
 * 카테고리 서비스
 * 카테고리 CRUD 등의 비즈니스 로직 처리
 */

import { prisma } from '../config/database';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../schemas/category.schema';

// === 응답 타입 정의 ===
export interface CategoryResponse {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    bookmarks: number;
  };
}

export interface CategoryListResponse {
  categories: CategoryResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// === 에러 타입 정의 ===
export class CategoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'CategoryError';
  }
}

// === 카테고리 서비스 클래스 ===
export class CategoryService {
  /**
   * 카테고리 생성
   */
  async createCategory(userId: string, data: CreateCategoryRequest): Promise<CategoryResponse> {
    // 중복 이름 검증
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId,
        name: data.name,
      },
    });

    if (existingCategory) {
      throw new CategoryError(
        '이미 존재하는 카테고리명입니다',
        'CATEGORY_ALREADY_EXISTS',
        400
      );
    }

    return await prisma.category.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  /**
   * 사용자별 카테고리 목록 조회
   */
  async getCategoriesByUserId(userId: string, skip: number, take: number): Promise<{ categories: CategoryResponse[], total: number }> {
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where: { userId },
        skip,
        take,
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

    return { categories, total };
  }

  /**
   * 카테고리 단일 조회
   */
  async getCategoryById(id: string, userId: string): Promise<CategoryResponse | null> {
    return await prisma.category.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });
  }

  /**
   * 카테고리 수정
   */
  async updateCategory(id: string, userId: string, data: UpdateCategoryRequest): Promise<CategoryResponse | null> {
    const existingCategory = await prisma.category.findFirst({
      where: { id, userId },
    });

    if (!existingCategory) {
      throw new CategoryError(
        '카테고리를 찾을 수 없습니다',
        'CATEGORY_NOT_FOUND',
        404
      );
    }

    return await prisma.category.update({
      where: { id },
      data,
    });
  }

  /**
   * 카테고리 삭제
   */
  async deleteCategory(id: string, userId: string): Promise<void> {
    const existingCategory = await prisma.category.findFirst({
      where: { id, userId },
    });

    if (!existingCategory) {
      throw new CategoryError(
        '카테고리를 찾을 수 없습니다',
        'CATEGORY_NOT_FOUND',
        404
      );
    }

    await prisma.category.delete({
      where: { id },
    });
  }
}

// === 싱글톤 인스턴스 ===
export const categoryService = new CategoryService();