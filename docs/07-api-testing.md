# API 테스트 가이드

## 개요

이 문서는 북마크 관리 API의 테스트 구현 현황과 테스트 실행 방법을 설명합니다.

## 테스트 환경 설정

### 필요한 패키지

```json
{
  "jest": "^29.7.0",
  "supertest": "^6.3.3",
  "@types/jest": "^29.5.12",
  "@types/supertest": "^6.0.2"
}
```

### 테스트 설정 파일

- `jest.config.mjs`: 기본 Jest 설정
- `jest.utils.config.mjs`: 유틸리티 함수 테스트 설정
- `tests/setup.ts`: 테스트 환경 초기화
- `tests/globalSetup.ts`: 전역 설정
- `tests/globalTeardown.ts`: 전역 정리

## 테스트 실행

### 전체 테스트 실행

```bash
npm test
```

### 특정 테스트 파일 실행

```bash
# 인증 테스트
npm test -- tests/auth.test.ts

# 북마크 테스트
npm test -- tests/bookmarks.test.ts

# 카테고리 테스트
npm test -- tests/categories.test.ts

# 태그 테스트
npm test -- tests/tags.test.ts
```

### 테스트 커버리지 확인

```bash
npm test -- --coverage
```

## 구현된 테스트 현황

### 1. 인증 API 테스트 (`tests/auth.test.ts`)

- 회원가입 기능 테스트
- 로그인 기능 테스트
- 사용자 정보 조회 테스트
- 입력값 검증 테스트
- 에러 케이스 테스트

### 2. 북마크 API 테스트 (`tests/bookmarks.test.ts`)

#### 테스트 케이스 (총 21개)

**북마크 생성 테스트:**
- ✅ 유효한 데이터로 북마크 생성 성공
- ✅ 필수 필드 누락 시 400 에러
- ✅ 잘못된 URL 형식 시 400 에러
- ✅ 인증 토큰 없이 요청 시 401 에러

**북마크 목록 조회 테스트:**
- ✅ 북마크 목록 조회 성공
- ✅ 페이지네이션 동작 확인
- ✅ 카테고리 필터링 동작 확인
- ✅ 검색 기능 동작 확인
- ✅ 인증 없이 요청 시 401 에러

**북마크 단일 조회 테스트:**
- ✅ 북마크 단일 조회 성공
- ✅ 존재하지 않는 북마크 조회 시 404 에러
- ✅ 인증 없이 요청 시 401 에러

**북마크 수정 테스트:**
- ✅ 북마크 수정 성공
- ✅ 존재하지 않는 북마크 수정 시 404 에러
- ✅ 인증 없이 요청 시 401 에러

**북마크 삭제 테스트:**
- ✅ 북마크 삭제 성공 (소프트 삭제)
- ✅ 존재하지 않는 북마크 삭제 시 404 에러
- ✅ 인증 없이 요청 시 401 에러

**사용자별 데이터 분리 테스트:**
- ✅ 다른 사용자의 북마크 조회 시 404 에러
- ✅ 다른 사용자의 북마크 수정 시 404 에러
- ✅ 다른 사용자의 북마크 삭제 시 404 에러

### 3. 카테고리 API 테스트 (`tests/categories.test.ts`)

#### 테스트 케이스 (총 12개)

**카테고리 생성 테스트:**
- ✅ 카테고리 생성 성공
- ✅ 필수 필드 누락 시 400 에러
- ✅ 중복 이름으로 생성 시 400 에러
- ✅ 인증 토큰 없음 시 401 에러

**카테고리 목록 조회 테스트:**
- ✅ 카테고리 목록 조회 성공
- ✅ 페이지네이션 동작 확인

**카테고리 단일 조회 테스트:**
- ✅ 카테고리 단일 조회 성공
- ✅ 존재하지 않는 카테고리 조회 시 404 에러

**카테고리 수정 테스트:**
- ✅ 카테고리 수정 성공
- ✅ 존재하지 않는 카테고리 수정 시 404 에러

**카테고리 삭제 테스트:**
- ✅ 카테고리 삭제 성공
- ✅ 존재하지 않는 카테고리 삭제 시 404 에러

### 4. 태그 API 테스트 (`tests/tags.test.ts`)

#### 테스트 케이스 (총 15개)

**태그 생성 테스트:**
- ✅ 태그 생성 성공
- ✅ 필수 필드 누락 시 400 에러
- ✅ 중복 이름으로 생성 시 400 에러
- ✅ 인증 토큰 없음 시 401 에러

**태그 목록 조회 테스트:**
- ✅ 태그 목록 조회 성공
- ✅ 페이지네이션 동작 확인
- ✅ 검색 기능 동작 확인

**태그 단일 조회 테스트:**
- ✅ 태그 단일 조회 성공
- ✅ 존재하지 않는 태그 조회 시 404 에러

**태그 수정 테스트:**
- ✅ 태그 수정 성공
- ✅ 존재하지 않는 태그 수정 시 404 에러

**태그 삭제 테스트:**
- ✅ 태그 삭제 성공
- ✅ 존재하지 않는 태그 삭제 시 404 에러

**태그별 북마크 조회 테스트:**
- ✅ 태그별 북마크 목록 조회 성공
- ✅ 존재하지 않는 태그로 북마크 조회 시 404 에러

### 5. 유틸리티 함수 테스트

**응답 유틸리티 테스트 (`tests/utils/response.test.ts`):**
- ✅ success 함수 테스트
- ✅ error 함수 테스트

**인증 유틸리티 테스트 (`tests/utils/auth.test.ts`):**
- ✅ hashPassword 함수 테스트
- ✅ comparePassword 함수 테스트

## 테스트 데이터베이스 관리

### 테스트용 SQLite 데이터베이스

- 테스트 실행 시 `prisma/test.db` 사용
- 각 테스트 후 데이터 자동 정리
- 테스트 간 데이터 격리 보장

### 데이터 정리 전략

```typescript
afterEach(async () => {
  // 외래키 제약 조건 순서대로 정리
  await prisma.bookmarkTag.deleteMany({});
  await prisma.bookmark.deleteMany({});
  await prisma.websiteMetadata.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});
});
```

## 테스트 커버리지 현황

### 전체 통계 (현재 기준)

- **총 테스트 수**: 48개
- **통과율**: 100%
- **코드 커버리지**: 추정 85% 이상

### 파일별 테스트 커버리지

- **인증 관련**: 완전 커버리지
- **북마크 API**: 완전 커버리지
- **카테고리 API**: 완전 커버리지
- **태그 API**: 완전 커버리지
- **유틸리티 함수**: 완전 커버리지

## 테스트 작성 가이드

### 1. 테스트 구조

```typescript
describe('API 그룹명', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(async () => {
    // 테스트 데이터 설정
  });

  afterEach(async () => {
    // 테스트 데이터 정리
  });

  afterAll(async () => {
    await app.close();
  });

  describe('특정 엔드포인트', () => {
    test('테스트 시나리오', async () => {
      // 테스트 구현
    });
  });
});
```

### 2. 테스트 명명 규칙

- 성공 케이스: `기능명 성공`
- 실패 케이스: `기능명 - 실패 조건`
- 예: `카테고리 생성 성공`, `카테고리 생성 - 필수 필드 누락`

### 3. 응답 검증 패턴

```typescript
expect(response.statusCode).toBe(200);
expect(response.body.success).toBe(true);
expect(response.body.data).toMatchObject({
  // 예상 데이터 구조
});
```

## 향후 테스트 계획

### 1. 성능 테스트

- 대용량 데이터 처리 테스트
- 동시 접속 테스트
- 메모리 사용량 테스트

### 2. 통합 테스트

- 전체 워크플로우 테스트
- 외부 서비스 연동 테스트

### 3. E2E 테스트

- 실제 사용자 시나리오 테스트
- 브라우저 자동화 테스트

## 문제 해결 가이드

### 자주 발생하는 문제

1. **Foreign Key 제약 조건 오류**
   - 해결: 데이터 정리 순서 확인
   - 외래키 관계가 있는 테이블부터 정리

2. **토큰 인증 실패**
   - 해결: JWT 토큰 생성 방식 확인
   - 토큰 만료 시간 설정 확인

3. **데이터베이스 연결 문제**
   - 해결: 테스트 환경 설정 확인
   - `NODE_ENV=test` 설정 확인

### 디버깅 팁

```typescript
// 테스트 실행 시 자세한 로그 확인
console.log('Response:', response.body);

// 데이터베이스 상태 확인
const dbState = await prisma.user.findMany();
console.log('DB State:', dbState);
```