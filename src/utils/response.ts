/**
 * API 응답 형식을 표준화하는 유틸리티 함수들
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 표준 API 응답 생성
 */
export function createResponse<T = any>(
  success: boolean,
  message: string,
  data: T | null = null,
  errorCode?: string
): ApiResponse<T> {
  return {
    success,
    message,
    data,
    error: success
      ? null
      : {
          code: errorCode || 'UNKNOWN_ERROR',
          message,
        },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 에러 응답 생성
 */
export function createErrorResponse(
  message: string,
  code: string = 'UNKNOWN_ERROR'
): ApiResponse<null> {
  return createResponse(false, message, null, code);
}

/**
 * 페이지네이션 응답 생성
 */
export function createPaginatedResponse<T = any>(
  success: boolean,
  message: string,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
): PaginatedResponse<T> {
  const baseResponse = createResponse(success, message, data);
  
  return {
    ...baseResponse,
    data,
    pagination,
  };
}

/**
 * 성공 응답 생성 (간편 함수)
 */
export function success<T = any>(data: T, message: string = '요청이 성공했습니다.'): ApiResponse<T> {
  return createResponse(true, message, data);
}

/**
 * 에러 응답 생성 (간편 함수)
 */
export function error(message: string, code: string = 'UNKNOWN_ERROR'): ApiResponse<null> {
  return createErrorResponse(message, code);
}