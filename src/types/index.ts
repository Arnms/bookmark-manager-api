/**
 * 공통 타입 정의
 * API 응답, 에러, 페이지네이션 등 전역에서 사용되는 타입들
 */

// Prisma 클라이언트가 생성되면 주석 해제
// import type { User, Bookmark, Category, Tag, WebsiteMetadata } from '@prisma/client'

// 임시 타입 정의 (Prisma 클라이언트 생성 전까지)
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Bookmark {
  id: string;
  personalTitle?: string;
  personalNote?: string;
  isPublic: boolean;
  userId: string;
  websiteMetadataId: string;
  categoryId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Tag {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WebsiteMetadata {
  id: string;
  url: string;
  title?: string;
  description?: string;
  favicon?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// === API 응답 타입 ===

// 기본 API 응답 구조
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
}

// 에러 응답 구조
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
  timestamp: string;
}

// 페이지네이션 메타데이터
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 페이지네이션 응답
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// === 데이터베이스 관련 타입 ===

// 사용자 정보 (비밀번호 제외)
export type UserPublic = Omit<User, 'password'>;

// 북마크 상세 정보 (관계 포함)
export interface BookmarkWithDetails extends Bookmark {
  websiteMetadata: WebsiteMetadata;
  category?: Category | null;
  tags: Array<{
    tag: Tag;
  }>;
}

// 북마크 생성 요청
export interface CreateBookmarkRequest {
  url: string;
  personalTitle?: string;
  personalNote?: string;
  categoryId?: string;
  tags?: string[];
  isPublic?: boolean;
}

// 북마크 수정 요청
export interface UpdateBookmarkRequest {
  personalTitle?: string;
  personalNote?: string;
  categoryId?: string | null;
  tags?: string[];
  isPublic?: boolean;
}

// === 인증 관련 타입 ===

// JWT 페이로드
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// 로그인 요청
export interface LoginRequest {
  email: string;
  password: string;
}

// 회원가입 요청
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// 인증 응답
export interface AuthResponse {
  user: UserPublic;
  token: string;
}

// === 검색 관련 타입 ===

// 검색 매개변수
export interface SearchParams {
  q?: string;
  type?: 'all' | 'bookmarks' | 'categories' | 'tags';
  page?: number;
  limit?: number;
}

// 북마크 필터 매개변수
export interface BookmarkFilters {
  categoryId?: string;
  tags?: string[];
  search?: string;
  isPublic?: boolean;
  sort?: 'createdAt' | 'updatedAt' | 'title';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// === 에러 코드 열거형 ===

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// === 유틸리티 타입 ===

// 페이지네이션 옵션
export interface PaginationOptions {
  page: number;
  limit: number;
}

// 정렬 옵션
export interface SortOptions {
  sort: string;
  order: 'asc' | 'desc';
}
