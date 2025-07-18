/**
 * 북마크 관련 스키마 정의
 * 북마크 생성, 수정, 조회 등에서 사용하는 Zod 스키마
 */

import { z } from 'zod';

// === 북마크 생성 스키마 ===
export const createBookmarkSchema = z.object({
  url: z.string().url('유효한 URL을 입력해주세요.'),
  personalTitle: z.string().optional(),
  personalNote: z.string().optional(),
  categoryId: z.string().optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

// === 북마크 수정 스키마 ===
export const updateBookmarkSchema = z.object({
  personalTitle: z.string().optional(),
  personalNote: z.string().optional(),
  categoryId: z.string().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

// === 북마크 조회 쿼리 스키마 ===
export const getBookmarksSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  categoryId: z.string().optional(),
  search: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// === 북마크 태그 추가 스키마 ===
export const addTagsToBookmarkSchema = z.object({
  tagIds: z.array(z.string()),
});

// === 북마크 카테고리 변경 스키마 ===
export const updateBookmarkCategorySchema = z.object({
  categoryId: z.string().nullable(),
});

// === 타입 추론 ===
export type CreateBookmarkRequest = z.infer<typeof createBookmarkSchema>;
export type UpdateBookmarkRequest = z.infer<typeof updateBookmarkSchema>;
export type GetBookmarksQuery = z.infer<typeof getBookmarksSchema>;
export type AddTagsToBookmarkRequest = z.infer<typeof addTagsToBookmarkSchema>;
export type UpdateBookmarkCategoryRequest = z.infer<typeof updateBookmarkCategorySchema>;
