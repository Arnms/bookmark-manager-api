/**
 * 카테고리 관련 스키마 정의
 * 카테고리 생성, 수정, 조회 등에서 사용하는 Zod 스키마
 */

import { z } from 'zod';

// === 카테고리 생성 스키마 ===
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, '카테고리명은 필수입니다.')
    .max(100, '카테고리명은 100자 이내여야 합니다.'),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, '유효한 hex 색상 코드를 입력해주세요.')
    .optional(),
});

// === 카테고리 수정 스키마 ===
export const updateCategorySchema = createCategorySchema.partial();

// === 카테고리 조회 쿼리 스키마 ===
export const getCategoriesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

// === 카테고리 파라미터 스키마 ===
export const categoryParamsSchema = z.object({
  id: z.string(),
});

// === 타입 추론 ===
export type CreateCategoryRequest = z.infer<typeof createCategorySchema>;
export type UpdateCategoryRequest = z.infer<typeof updateCategorySchema>;
export type GetCategoriesQuery = z.infer<typeof getCategoriesSchema>;
export type CategoryParamsRequest = z.infer<typeof categoryParamsSchema>;
