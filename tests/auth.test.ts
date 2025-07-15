/**
 * 인증 API 통합 테스트
 * 회원가입, 로그인, 사용자 정보 조회 엔드포인트 테스트
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { prisma } from '../src/config/database';

describe('인증 API 테스트', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // 각 테스트 전에 사용자 데이터 정리
    await prisma.user.deleteMany({});
  });

  describe('POST /auth/register', () => {
    it('올바른 데이터로 회원가입 성공', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'testpassword123',
        name: '테스트 사용자',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: userData,
      });

      expect(response.statusCode).toBe(201);

      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.message).toBe('회원가입이 완료되었습니다.');
      expect(responseBody.data.user).toHaveProperty('id');
      expect(responseBody.data.user.email).toBe(userData.email);
      expect(responseBody.data.user.name).toBe(userData.name);
      expect(responseBody.data).toHaveProperty('token');
      expect(responseBody.data.user).not.toHaveProperty('password');
    });

    it('중복 이메일로 회원가입 실패', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'testpassword123',
        name: '테스트 사용자',
      };

      // 첫 번째 회원가입
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: userData,
      });

      // 동일한 이메일로 두 번째 회원가입 시도
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: userData,
      });

      expect(response.statusCode).toBe(400);

      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.message).toBe('이미 존재하는 이메일 주소입니다.');
    });

    it('유효하지 않은 이메일 형식으로 회원가입 실패', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'testpassword123',
        name: '테스트 사용자',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: userData,
      });

      expect(response.statusCode).toBe(400);

      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.message).toBe('입력 데이터가 유효하지 않습니다.');
      expect(responseBody.error.details).toBeDefined();
    });

    it('짧은 비밀번호로 회원가입 실패', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        name: '테스트 사용자',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: userData,
      });

      expect(response.statusCode).toBe(400);

      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.message).toBe('입력 데이터가 유효하지 않습니다.');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // 테스트용 사용자 생성
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'testpassword123',
          name: '테스트 사용자',
        },
      });
    });

    it('올바른 자격증명으로 로그인 성공', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'testpassword123',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: loginData,
      });

      expect(response.statusCode).toBe(200);

      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.message).toBe('로그인이 완료되었습니다.');
      expect(responseBody.data.user).toHaveProperty('id');
      expect(responseBody.data.user.email).toBe(loginData.email);
      expect(responseBody.data).toHaveProperty('token');
      expect(responseBody.data.user).not.toHaveProperty('password');
    });

    it('존재하지 않는 이메일로 로그인 실패', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'testpassword123',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: loginData,
      });

      expect(response.statusCode).toBe(401);

      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
    });

    it('잘못된 비밀번호로 로그인 실패', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: loginData,
      });

      expect(response.statusCode).toBe(401);

      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
    });
  });

  describe('GET /auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      // 테스트용 사용자 생성 및 로그인
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'testpassword123',
          name: '테스트 사용자',
        },
      });

      const registerBody = JSON.parse(registerResponse.body);
      authToken = registerBody.data.token;
    });

    it('유효한 토큰으로 사용자 정보 조회 성공', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.user).toHaveProperty('id');
      expect(responseBody.data.user.email).toBe('test@example.com');
      expect(responseBody.data.user.name).toBe('테스트 사용자');
      expect(responseBody.data.user).not.toHaveProperty('password');
    });

    it('토큰 없이 사용자 정보 조회 실패', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);

      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.message).toBe('인증이 필요합니다.');
    });

    it('유효하지 않은 토큰으로 사용자 정보 조회 실패', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);

      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.message).toBe('인증이 필요합니다.');
    });
  });
});
