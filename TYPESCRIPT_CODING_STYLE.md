# TypeScript 코딩 스타일 가이드

이 문서는 북마크 관리 API 프로젝트의 TypeScript 코딩 스타일과 컨벤션을 정의합니다.

## 1. 네이밍 규칙

### 클래스, 인터페이스, 타입
```typescript
// 클래스: PascalCase
class UserService {}
class BookmarkManager {}

// 인터페이스: PascalCase
interface ApiResponse<T> {}
interface CreateBookmarkRequest {}

// 타입: PascalCase
type BookmarkWithDetails = Bookmark & { tags: Tag[] };
type UserPublic = Omit<User, 'password'>;
```

### 변수, 함수, 프로퍼티
```typescript
// 변수: camelCase
const userRepository = new UserRepository();
const bookmarkData = await getBookmark(id);

// 함수: camelCase
const createUser = async (userData: CreateUserRequest) => {};
const hashPassword = (password: string) => {};

// 프로퍼티: camelCase
interface User {
  id: string;
  email: string;
  createdAt: Date;
  isPublic: boolean;
}
```

### 상수 및 열거형
```typescript
// 상수: UPPER_CASE
const DEFAULT_PAGE_SIZE = 20;
const JWT_EXPIRES_IN = '24h';
const MAX_BOOKMARK_TITLE_LENGTH = 200;

// 열거형: PascalCase
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
}
```

### 파일명
```typescript
// kebab-case 사용
auth.ts
bookmark-manager.ts
user-service.ts
database-config.ts
```

## 2. 타입 정의

### 인터페이스 우선 사용
```typescript
// ✅ 좋은 예
interface CreateBookmarkRequest {
  url: string;
  personalTitle?: string;
  personalNote?: string;
  categoryId?: string;
  tags?: string[];
  isPublic?: boolean;
}

// ❌ 피해야 할 예 (단순 객체는 type보다 interface)
type CreateBookmarkRequest = {
  url: string;
  personalTitle?: string;
}
```

### 제네릭 타입 활용
```typescript
// API 응답 제네릭
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
}

// 페이지네이션 제네릭
interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
```

### 유틸리티 타입 활용
```typescript
// Omit: 특정 필드 제외
type UserPublic = Omit<User, 'password'>;

// Pick: 특정 필드만 선택
type BookmarkUpdate = Partial<Pick<Bookmark, 'personalTitle' | 'personalNote'>>;

// Partial: 모든 필드 옵셔널
type UpdateUserRequest = Partial<User>;
```

## 3. 함수 및 메서드 구조

### 비동기 함수
```typescript
// async/await 사용
export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    try {
      const { email, password, name } = registerSchema.parse(request.body);
      
      // 이메일 중복 확인
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.status(400).send({
          error: '이미 존재하는 이메일 주소입니다.',
        });
      }

      // 비밀번호 해싱
      const hashedPassword = await hashPassword(password);

      // 사용자 생성
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      });

      return reply.status(201).send({
        success: true,
        data: { user: { id: user.id, email: user.email, name: user.name } },
        message: '회원가입이 완료되었습니다.',
      });
    } catch (error) {
      // 에러 처리
    }
  });
}
```

### 유틸리티 함수
```typescript
/**
 * 웹사이트 메타데이터 조회 또는 생성
 */
async function getOrCreateWebsiteMetadata(url: string) {
  let metadata = await prisma.websiteMetadata.findUnique({
    where: { url },
  });

  if (!metadata) {
    metadata = await prisma.websiteMetadata.create({
      data: {
        url,
        title: url,
        description: null,
        favicon: null,
        image: null,
      },
    });
  }

  return metadata;
}
```

## 4. 스키마 검증

### Zod 스키마 정의
```typescript
// 스키마 정의는 함수 시작 부분에 위치
const createBookmarkSchema = z.object({
  url: z.string().url('유효한 URL을 입력해주세요.'),
  personalTitle: z.string().optional(),
  personalNote: z.string().optional(),
  categoryId: z.string().optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

// 스키마 사용
const { url, personalTitle, personalNote, categoryId, isPublic, tags } = 
  createBookmarkSchema.parse(request.body);
```

### 환경변수 스키마
```typescript
const envSchema = z.object({
  DATABASE_URL: z.string().url('올바른 DATABASE_URL을 설정해주세요'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET은 최소 32자 이상이어야 합니다'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});
```

## 5. 코드 구조 및 조직

### 파일 구조
```typescript
/**
 * 파일 헤더 주석
 * 파일의 목적과 주요 기능을 설명
 */

// === 임포트 구조 ===
// 1. 외부 라이브러리
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// 2. 내부 모듈
import { prisma } from '../config/database';
import { hashPassword, verifyPassword } from '../utils/auth';
import { success, error } from '../utils/response';

// === 스키마 검증 정의 ===
const registerSchema = z.object({
  // 스키마 정의
});

// === 유틸리티 함수 ===
async function getOrCreateWebsiteMetadata(url: string) {
  // 구현
}

// === 메인 함수 ===
export default async function routes(fastify: FastifyInstance) {
  // 라우트 정의
}
```

### 섹션 구분
```typescript
// === 섹션 구분 주석 사용 ===
// 큰 섹션은 === 사용
// 작은 섹션은 // 사용

// === 스키마 검증 정의 ===
const createSchema = z.object({});
const updateSchema = z.object({});

// === 유틸리티 함수 ===
async function helperFunction() {}

// === API 엔드포인트 ===
export default async function routes(fastify: FastifyInstance) {
  // 북마크 생성 API
  fastify.post('/bookmarks', async (request, reply) => {
    // 구현
  });
}
```

## 6. 에러 처리 패턴

### 일관된 에러 응답
```typescript
try {
  // 비즈니스 로직
  const result = await someAsyncOperation();
  
  return reply.status(200).send(
    success(result, '작업이 성공적으로 완료되었습니다.')
  );
} catch (err) {
  console.error('에러 발생:', err);
  
  if (err instanceof z.ZodError) {
    return reply.status(400).send(
      error('VALIDATION_ERROR', '입력값 검증에 실패했습니다.', err.errors)
    );
  }
  
  return reply.status(500).send(
    error('INTERNAL_ERROR', '서버 내부 오류가 발생했습니다.')
  );
}
```

### 에러 타입 정의
```typescript
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
```

## 7. 데이터베이스 접근 패턴

### Prisma 클라이언트 사용
```typescript
// 싱글톤 패턴
const prisma = new PrismaClient();

// 트랜잭션 처리
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const profile = await tx.profile.create({ 
    data: { userId: user.id, ...profileData } 
  });
  return { user, profile };
});

// 관계형 데이터 조회
const bookmarks = await prisma.bookmark.findMany({
  include: {
    websiteMetadata: true,
    category: true,
    tags: {
      include: {
        tag: true,
      },
    },
  },
  where: {
    userId: user.id,
    deletedAt: null,
  },
});
```

## 8. 주석 규칙

### 함수 주석
```typescript
/**
 * 웹사이트 메타데이터 조회 또는 생성
 * 이미 존재하는 URL이면 기존 메타데이터를 반환하고,
 * 없으면 새로 생성하여 반환
 */
async function getOrCreateWebsiteMetadata(url: string) {
  // 구현
}
```

### 섹션 주석
```typescript
// === 스키마 검증 정의 ===
// 북마크 생성 스키마 검증
const createBookmarkSchema = z.object({
  // 스키마 정의
});

// === 유틸리티 함수 ===
// 웹사이트 메타데이터 관련 헬퍼 함수들
```

### 인라인 주석
```typescript
// 이메일 중복 확인
const existingUser = await prisma.user.findUnique({
  where: { email },
});

// 비밀번호 해싱
const hashedPassword = await hashPassword(password);
```

## 9. 코드 포맷팅

### 들여쓰기 및 공백
```typescript
// 들여�기: 2칸 스페이스
if (condition) {
  doSomething();
}

// 객체 리터럴 공백
const user = {
  id: 'user-id',
  name: 'John Doe',
  email: 'john@example.com',
};

// 함수 매개변수 공백
const createUser = async (userData: CreateUserRequest) => {
  // 구현
};
```

### 줄 길이 제한
```typescript
// 긴 줄은 적절히 분리
const longVariableName = await prisma.bookmark.findMany({
  where: {
    userId: user.id,
    deletedAt: null,
  },
  include: {
    websiteMetadata: true,
    category: true,
  },
});
```

## 10. 테스트 코드 스타일

### 테스트 구조
```typescript
describe('북마크 API', () => {
  beforeEach(async () => {
    // 테스트 데이터 준비
  });

  test('북마크 생성 성공', async () => {
    // Given
    const bookmarkData = {
      url: 'https://example.com',
      personalTitle: '테스트 북마크',
    };

    // When
    const response = await request(app)
      .post('/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send(bookmarkData);

    // Then
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

이 가이드는 프로젝트의 발전과 함께 지속적으로 업데이트됩니다.