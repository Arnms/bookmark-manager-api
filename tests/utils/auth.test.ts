/**
 * 인증 유틸리티 함수 테스트
 * 비밀번호 해싱 및 검증 기능 테스트
 */

import { hashPassword, verifyPassword } from '../../src/utils/auth';

// 이 테스트는 데이터베이스가 필요하지 않으므로 setup.ts를 사용하지 않음
describe('인증 유틸리티 함수 테스트', () => {
  describe('hashPassword', () => {
    it('비밀번호를 해싱해야 함', async () => {
      const password = 'testpassword123';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
      expect(hashedPassword).toMatch(/^\$2[ayb]\$\d+\$/); // bcrypt 해시 패턴
    });

    it('동일한 비밀번호라도 다른 해시값을 생성해야 함', async () => {
      const password = 'testpassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('올바른 비밀번호 검증 성공', async () => {
      const password = 'testpassword123';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('잘못된 비밀번호 검증 실패', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('빈 문자열 비밀번호 검증 실패', async () => {
      const password = 'testpassword123';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword('', hashedPassword);
      expect(isValid).toBe(false);
    });
  });
});
