import { createResponse, createErrorResponse, createPaginatedResponse } from '../../src/utils/response';

describe('응답 유틸리티 함수 테스트', () => {
  describe('createResponse', () => {
    it('성공 응답을 생성해야 함', () => {
      const data = { id: 1, name: 'test' };
      const message = '성공적으로 처리되었습니다';

      const response = createResponse(true, message, data);

      expect(response.success).toBe(true);
      expect(response.message).toBe(message);
      expect(response.data).toEqual(data);
      expect(response.timestamp).toBeDefined();
      expect(response.error).toBeNull();
    });

    it('실패 응답을 생성해야 함', () => {
      const errorCode = 'VALIDATION_ERROR';
      const message = '입력 데이터가 유효하지 않습니다';

      const response = createResponse(false, message, null, errorCode);

      expect(response.success).toBe(false);
      expect(response.message).toBe(message);
      expect(response.data).toBeNull();
      expect(response.error).toEqual({
        code: errorCode,
        message: message,
      });
      expect(response.timestamp).toBeDefined();
    });
  });

  describe('createErrorResponse', () => {
    it('에러 응답을 생성해야 함', () => {
      const message = '서버 오류가 발생했습니다';
      const code = 'INTERNAL_SERVER_ERROR';

      const response = createErrorResponse(message, code);

      expect(response.success).toBe(false);
      expect(response.message).toBe(message);
      expect(response.data).toBeNull();
      expect(response.error).toEqual({
        code: code,
        message: message,
      });
      expect(response.timestamp).toBeDefined();
    });

    it('기본 에러 코드로 에러 응답을 생성해야 함', () => {
      const message = '알 수 없는 오류가 발생했습니다';

      const response = createErrorResponse(message);

      expect(response.success).toBe(false);
      expect(response.message).toBe(message);
      expect(response.error?.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('createPaginatedResponse', () => {
    it('페이지네이션 응답을 생성해야 함', () => {
      const data = [
        { id: 1, name: 'item1' },
        { id: 2, name: 'item2' },
      ];
      const pagination = {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      };
      const message = '데이터를 성공적으로 조회했습니다';

      const response = createPaginatedResponse(true, message, data, pagination);

      expect(response.success).toBe(true);
      expect(response.message).toBe(message);
      expect(response.data).toEqual(data);
      expect(response.pagination).toEqual(pagination);
      expect(response.timestamp).toBeDefined();
    });

    it('빈 데이터 페이지네이션 응답을 생성해야 함', () => {
      const data: any[] = [];
      const pagination = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      };

      const response = createPaginatedResponse(true, '데이터가 없습니다', data, pagination);

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
      expect(response.pagination.total).toBe(0);
      expect(response.pagination.totalPages).toBe(0);
    });
  });
});