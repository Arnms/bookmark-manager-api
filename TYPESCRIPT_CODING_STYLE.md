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
type UserPublic = Omit<User, "password">;
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
const JWT_EXPIRES_IN = "24h";
const MAX_BOOKMARK_TITLE_LENGTH = 200;

// 열거형: PascalCase
enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  NOT_FOUND = "NOT_FOUND",
}
```

### 파일명

```typescript
// kebab-case 사용
auth.ts;
bookmark - manager.ts;
user - service.ts;
database - config.ts;
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
};
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
type UserPublic = Omit<User, "password">;

// Pick: 특정 필드만 선택
type BookmarkUpdate = Partial<Pick<Bookmark, "personalTitle" | "personalNote">>;

// Partial: 모든 필드 옵셔널
type UpdateUserRequest = Partial<User>;
```

## 3. 함수 및 메서드 구조

### 비동기 함수

```typescript
// async/await 사용
export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/register", async (request, reply) => {
    try {
      const { email, password, name } = registerSchema.parse(request.body);

      // 이메일 중복 확인
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.status(400).send({
          error: "이미 존재하는 이메일 주소입니다.",
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
        message: "회원가입이 완료되었습니다.",
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

## 4. 아키텍처 패턴

### 3-Layer Architecture

프로젝트는 Presentation → Core → Infrastructure 계층 구조를 따릅니다.

```typescript
// === Presentation Layer (routes/) ===
// HTTP 요청/응답 처리, 입력값 검증
export default async function bookmarkRoutes(fastify: FastifyInstance) {
  fastify.post("/bookmarks", async (request, reply) => {
    const bookmarkData = createBookmarkSchema.parse(request.body);
    const result = await bookmarkService.createBookmark(user.id, bookmarkData);
    return reply.status(201).send(success(result));
  });
}

// === Core Layer (services/) ===
// 비즈니스 로직과 도메인 규칙
export class BookmarkService {
  constructor(
    private bookmarkRepository: BookmarkRepository,
    private metadataService: MetadataService
  ) {}

  async createBookmark(userId: string, data: CreateBookmarkData) {
    // 비즈니스 로직 처리
    const metadata = await this.metadataService.getOrCreateMetadata(data.url);
    return this.bookmarkRepository.create(userId, data, metadata.id);
  }
}

// === Infrastructure Layer (repositories/) ===
// 데이터 액세스, 외부 서비스 연동
export class BookmarkRepository {
  async create(userId: string, data: CreateBookmarkData, metadataId: string) {
    return prisma.bookmark.create({
      data: { ...data, userId, websiteMetadataId: metadataId },
    });
  }
}
```

### 의존성 주입 (Dependency Injection)

생성자 주입 방식을 사용하여 의존성을 관리합니다.

```typescript
// 서비스 클래스
export class BookmarkService {
  constructor(
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly metadataService: MetadataService,
    private readonly tagService: TagService
  ) {}
}

// DI Container 설정
export class DIContainer {
  private static instance: DIContainer;

  static getInstance() {
    if (!this.instance) {
      this.instance = new DIContainer();
    }
    return this.instance;
  }

  createBookmarkService(): BookmarkService {
    return new BookmarkService(
      new BookmarkRepository(),
      new MetadataService(),
      new TagService()
    );
  }
}
```

### Repository Pattern

데이터 액세스 계층을 추상화하여 비즈니스 로직과 분리합니다.

```typescript
// Repository 인터페이스
export interface IBookmarkRepository {
  findById(id: string): Promise<Bookmark | null>;
  findByUserId(userId: string, options?: FindOptions): Promise<Bookmark[]>;
  create(data: CreateBookmarkData): Promise<Bookmark>;
  update(id: string, data: UpdateBookmarkData): Promise<Bookmark>;
  delete(id: string): Promise<void>;
}

// Prisma Repository 구현
export class PrismaBookmarkRepository implements IBookmarkRepository {
  async findById(id: string): Promise<Bookmark | null> {
    return prisma.bookmark.findUnique({
      where: { id, deletedAt: null },
      include: {
        websiteMetadata: true,
        category: true,
        tags: { include: { tag: true } },
      },
    });
  }

  async findByUserId(
    userId: string,
    options: FindOptions = {}
  ): Promise<Bookmark[]> {
    return prisma.bookmark.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(options.categoryId && { categoryId: options.categoryId }),
      },
      include: {
        websiteMetadata: true,
        category: true,
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: options.offset,
      take: options.limit,
    });
  }
}
```

### Service Pattern

비즈니스 로직을 캡슐화하고 재사용 가능한 서비스로 구성합니다.

```typescript
// 서비스 레이어에서 복잡한 비즈니스 로직 처리
export class BookmarkService {
  async createBookmarkWithTags(
    userId: string,
    bookmarkData: CreateBookmarkRequest
  ): Promise<BookmarkWithDetails> {
    return await prisma.$transaction(async (tx) => {
      // 1. 웹사이트 메타데이터 처리
      const metadata = await this.metadataService.getOrCreateMetadata(
        bookmarkData.url,
        tx
      );

      // 2. 북마크 생성
      const bookmark = await this.bookmarkRepository.create(
        {
          ...bookmarkData,
          userId,
          websiteMetadataId: metadata.id,
        },
        tx
      );

      // 3. 태그 연결 처리
      if (bookmarkData.tags?.length) {
        await this.tagService.attachTagsToBookmark(
          bookmark.id,
          bookmarkData.tags,
          userId,
          tx
        );
      }

      return this.bookmarkRepository.findById(bookmark.id);
    });
  }
}
```

## 5. API 설계 원칙

### RESTful API 설계

리소스 중심의 URL 구조와 HTTP 메서드를 적절히 활용합니다.

```typescript
// 리소스 기반 엔드포인트
GET    /api/bookmarks              # 북마크 목록 조회
POST   /api/bookmarks              # 북마크 생성
GET    /api/bookmarks/:id          # 특정 북마크 조회
PUT    /api/bookmarks/:id          # 북마크 전체 수정
PATCH  /api/bookmarks/:id          # 북마크 부분 수정
DELETE /api/bookmarks/:id          # 북마크 삭제

GET    /api/bookmarks/:id/tags     # 북마크의 태그 목록
POST   /api/bookmarks/:id/tags     # 북마크에 태그 추가
DELETE /api/bookmarks/:id/tags/:tagId  # 북마크에서 태그 제거

GET    /api/categories             # 카테고리 목록
POST   /api/categories             # 카테고리 생성
```

### HTTP 상태 코드 가이드

각 상황에 적절한 HTTP 상태 코드를 사용합니다.

```typescript
// 성공 응답
export const HttpStatus = {
  OK: 200, // 조회, 수정 성공
  CREATED: 201, // 생성 성공
  NO_CONTENT: 204, // 삭제 성공 (응답 본문 없음)
} as const;

// 클라이언트 오류
export const ClientError = {
  BAD_REQUEST: 400, // 잘못된 요청
  UNAUTHORIZED: 401, // 인증 실패
  FORBIDDEN: 403, // 권한 없음
  NOT_FOUND: 404, // 리소스 없음
  CONFLICT: 409, // 리소스 충돌 (중복 생성 등)
  UNPROCESSABLE: 422, // 유효성 검증 실패
} as const;

// 서버 오류
export const ServerError = {
  INTERNAL_ERROR: 500, // 서버 내부 오류
  SERVICE_UNAVAILABLE: 503, // 서비스 사용 불가
} as const;

// 실제 사용 예시
fastify.post("/bookmarks", async (request, reply) => {
  try {
    const result = await bookmarkService.create(data);
    return reply.status(HttpStatus.CREATED).send(success(result));
  } catch (error) {
    if (error instanceof ValidationError) {
      return reply
        .status(ClientError.UNPROCESSABLE)
        .send(errorResponse(error.message, error.details));
    }
    throw error; // 글로벌 에러 핸들러로 전달
  }
});
```

### API 응답 형식 표준화

일관된 응답 구조를 사용합니다.

```typescript
// 성공 응답 표준
interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

// 오류 응답 표준
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ValidationError[];
  };
  timestamp: string;
}

// 응답 헬퍼 함수
export const success = <T>(
  data: T,
  message = "요청이 성공적으로 처리되었습니다."
): SuccessResponse<T> => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString(),
});

export const errorResponse = (
  code: string,
  message: string,
  details?: any
): ErrorResponse => ({
  success: false,
  error: { code, message, details },
  timestamp: new Date().toISOString(),
});
```

## 6. 스키마 검증

### Zod 스키마 정의

```typescript
// 스키마 정의는 함수 시작 부분에 위치
const createBookmarkSchema = z.object({
  url: z.string().url("유효한 URL을 입력해주세요."),
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
  DATABASE_URL: z.string().url("올바른 DATABASE_URL을 설정해주세요"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET은 최소 32자 이상이어야 합니다"),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
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
import { FastifyInstance } from "fastify";
import { z } from "zod";

// 2. 내부 모듈
import { prisma } from "../config/database";
import { hashPassword, verifyPassword } from "../utils/auth";
import { success, error } from "../utils/response";

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
  fastify.post("/bookmarks", async (request, reply) => {
    // 구현
  });
}
```

## 8. 에러 처리 패턴

### 커스텀 Exception 클래스

도메인별 예외를 명확하게 정의하여 에러 처리를 체계화합니다.

```typescript
// 기본 애플리케이션 에러
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  abstract readonly isOperational: boolean;

  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 비즈니스 로직 에러
export class BusinessError extends AppError {
  readonly statusCode = 400;
  readonly code = 'BUSINESS_ERROR';
  readonly isOperational = true;
}

// 유효성 검증 에러
export class ValidationError extends AppError {
  readonly statusCode = 422;
  readonly code = 'VALIDATION_ERROR';
  readonly isOperational = true;

  constructor(message: string, public readonly details: ValidationDetail[]) {
    super(message);
  }
}

// 리소스 없음 에러
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';
  readonly isOperational = true;
}

// 권한 에러
export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = 'UNAUTHORIZED';
  readonly isOperational = true;
}

// 사용 예시
export class BookmarkService {
  async getBookmark(id: string, userId: string): Promise<Bookmark> {
    const bookmark = await this.bookmarkRepository.findById(id);
    
    if (!bookmark) {
      throw new NotFoundError(`북마크를 찾을 수 없습니다.`, { bookmarkId: id });
    }
    
    if (bookmark.userId !== userId) {
      throw new UnauthorizedError(`해당 북마크에 접근할 권한이 없습니다.`);
    }
    
    return bookmark;
  }
}
```

### 로깅 시스템

구조화된 로깅으로 디버깅과 모니터링을 지원합니다.

```typescript
// 로거 설정
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

// 에러 로깅 미들웨어
export const errorLogger = (error: Error, context: Record<string, unknown> = {}) => {
  if (error instanceof AppError) {
    if (error.isOperational) {
      logger.warn({
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          context: error.context,
        },
        ...context,
      }, 'Operational error occurred');
    } else {
      logger.error({
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code,
          statusCode: error.statusCode,
          context: error.context,
        },
        ...context,
      }, 'Non-operational error occurred');
    }
  } else {
    logger.error({
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    }, 'Unexpected error occurred');
  }
};

// 요청 로깅
export const requestLogger = (request: FastifyRequest) => {
  logger.info({
    request: {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: request.user?.id,
    },
  }, 'Request received');
};
```

### 일관된 에러 응답

```typescript
// 글로벌 에러 핸들러
export const errorHandler = (error: Error, request: FastifyRequest, reply: FastifyReply) => {
  // 에러 로깅
  errorLogger(error, {
    request: {
      method: request.method,
      url: request.url,
      userId: request.user?.id,
    },
  });

  // AppError 타입별 처리
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof ValidationError && { details: error.details }),
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Zod 검증 에러
  if (error instanceof z.ZodError) {
    return reply.status(422).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '입력값 검증에 실패했습니다.',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  }

  // 예상치 못한 에러
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '서버 내부 오류가 발생했습니다.',
    },
    timestamp: new Date().toISOString(),
  });
};

// Fastify 에러 핸들러 등록
fastify.setErrorHandler(errorHandler);
```

### 에러 타입 정의

```typescript
export interface ValidationDetail {
  field: string;
  message: string;
  value?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ValidationDetail[];
  };
  timestamp: string;
}
```

## 9. 데이터베이스 접근 패턴

### Prisma 클라이언트 사용

```typescript
// 싱글톤 패턴
const prisma = new PrismaClient();

// 트랜잭션 처리
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const profile = await tx.profile.create({
    data: { userId: user.id, ...profileData },
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

### 마이그레이션 관리

데이터베이스 스키마 변경을 체계적으로 관리합니다.

```typescript
// prisma/schema.prisma 수정 후 마이그레이션 생성
// npm run migrate:create -- --name add_bookmark_tags

// 마이그레이션 파일 예시 (prisma/migrations/xxx_add_bookmark_tags/migration.sql)
/*
  # Add tag system for bookmarks
  
  Warnings:
  - A new table `Tag` will be created
  - A new table `BookmarkTag` will be created for many-to-many relationship
*/

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7),
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookmarkTag" (
    "bookmark_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookmarkTag_pkey" PRIMARY KEY ("bookmark_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_user_id_name_key" ON "Tag"("user_id", "name");

-- CreateIndex
CREATE INDEX "BookmarkTag_bookmark_id_idx" ON "BookmarkTag"("bookmark_id");

-- CreateIndex
CREATE INDEX "BookmarkTag_tag_id_idx" ON "BookmarkTag"("tag_id");

// 마이그레이션 적용 명령어
// npm run migrate:deploy    # 프로덕션
// npm run migrate:dev       # 개발환경
```

### 인덱스 최적화

쿼리 성능 향상을 위한 인덱스 전략을 정의합니다.

```typescript
// schema.prisma에서 인덱스 정의
model Bookmark {
  id               String   @id @default(cuid())
  url              String
  personalTitle    String?  @db.VarChar(200)
  personalNote     String?  @db.Text
  isPublic        Boolean  @default(false)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")
  
  userId              String @map("user_id")
  categoryId          String? @map("category_id")
  websiteMetadataId   String @map("website_metadata_id")

  // 복합 인덱스 - 사용자별 북마크 조회 최적화
  @@index([userId, deletedAt, createdAt(sort: Desc)]) @map("idx_bookmark_user_active")
  
  // 카테고리별 조회 최적화
  @@index([userId, categoryId, deletedAt]) @map("idx_bookmark_category")
  
  // 공개 북마크 조회 최적화
  @@index([isPublic, deletedAt, createdAt(sort: Desc)]) @map("idx_bookmark_public")
  
  // URL 기반 중복 체크
  @@index([userId, url]) @map("idx_bookmark_url_unique")
  
  @@map("Bookmark")
}

model Tag {
  id        String   @id @default(cuid())
  name      String   @db.VarChar(50)
  color     String?  @db.VarChar(7)
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // 사용자별 태그명 유니크 제약
  @@unique([userId, name]) @map("uq_tag_user_name")
  
  // 사용자별 태그 조회 최적화
  @@index([userId, name]) @map("idx_tag_user")
  
  @@map("Tag")
}

// 검색 성능을 위한 전체 텍스트 검색 인덱스
model WebsiteMetadata {
  id          String   @id @default(cuid())
  url         String   @unique @db.VarChar(2048)
  title       String?  @db.VarChar(500)
  description String?  @db.Text
  favicon     String?  @db.VarChar(2048)
  image       String?  @db.VarChar(2048)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // 전체 텍스트 검색을 위한 인덱스 (PostgreSQL)
  @@index([title]) @map("idx_metadata_title_search")
  @@index([description]) @map("idx_metadata_desc_search")
  
  @@map("WebsiteMetadata")
}
```

### 쿼리 최적화 패턴

```typescript
// N+1 문제 방지를 위한 적절한 include 사용
export class BookmarkRepository {
  async findWithRelations(userId: string, options: FindOptions = {}) {
    return prisma.bookmark.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(options.categoryId && { categoryId: options.categoryId }),
        ...(options.search && {
          OR: [
            { personalTitle: { contains: options.search, mode: 'insensitive' } },
            { personalNote: { contains: options.search, mode: 'insensitive' } },
            { 
              websiteMetadata: {
                OR: [
                  { title: { contains: options.search, mode: 'insensitive' } },
                  { description: { contains: options.search, mode: 'insensitive' } },
                ],
              },
            },
          ],
        }),
      },
      include: {
        websiteMetadata: {
          select: {
            title: true,
            description: true,
            favicon: true,
            image: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      skip: options.offset,
      take: options.limit,
    });
  }

  // 배치 처리를 위한 bulk operations
  async createMany(bookmarks: CreateBookmarkData[]): Promise<number> {
    const result = await prisma.bookmark.createMany({
      data: bookmarks,
      skipDuplicates: true, // 중복 무시
    });
    return result.count;
  }

  // 소프트 삭제 배치 처리
  async softDeleteMany(ids: string[], userId: string): Promise<number> {
    const result = await prisma.bookmark.updateMany({
      where: {
        id: { in: ids },
        userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    return result.count;
  }
}
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

### 세미콜론 사용

```typescript
// 모든 구문 끝에 세미콜론을 반드시 사용
const user = { id: "user-id", name: "John" };
const result = await someFunction();
import { FastifyInstance } from "fastify";

// 객체나 배열 마지막 요소 뒤에도 세미콜론 사용
const config = {
  port: 3000,
  host: "localhost",
};

const items = ["item1", "item2", "item3"];
```

### 들여쓰기 및 공백

```typescript
// 들여쓰기: 2칸 스페이스
if (condition) {
  doSomething();
}

// 객체 리터럴 공백
const user = {
  id: "user-id",
  name: "John Doe",
  email: "john@example.com",
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

### 단위 테스트 구조

```typescript
describe("BookmarkService", () => {
  let bookmarkService: BookmarkService;
  let mockBookmarkRepository: jest.Mocked<IBookmarkRepository>;
  let mockMetadataService: jest.Mocked<MetadataService>;

  beforeEach(() => {
    mockBookmarkRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IBookmarkRepository>;

    mockMetadataService = {
      getOrCreateMetadata: jest.fn(),
    } as jest.Mocked<MetadataService>;

    bookmarkService = new BookmarkService(
      mockBookmarkRepository,
      mockMetadataService
    );
  });

  describe("createBookmark", () => {
    test("북마크 생성 성공", async () => {
      // Given
      const userId = "user-123";
      const bookmarkData = {
        url: "https://example.com",
        personalTitle: "테스트 북마크",
      };
      const mockMetadata = { id: "metadata-123", url: bookmarkData.url };
      const mockBookmark = { id: "bookmark-123", ...bookmarkData, userId };

      mockMetadataService.getOrCreateMetadata.mockResolvedValue(mockMetadata);
      mockBookmarkRepository.create.mockResolvedValue(mockBookmark);

      // When
      const result = await bookmarkService.createBookmark(userId, bookmarkData);

      // Then
      expect(mockMetadataService.getOrCreateMetadata).toHaveBeenCalledWith(
        bookmarkData.url
      );
      expect(mockBookmarkRepository.create).toHaveBeenCalledWith(
        userId,
        bookmarkData,
        mockMetadata.id
      );
      expect(result).toEqual(mockBookmark);
    });

    test("유효하지 않은 URL로 북마크 생성 실패", async () => {
      // Given
      const userId = "user-123";
      const invalidBookmarkData = {
        url: "invalid-url",
        personalTitle: "테스트 북마크",
      };

      // When & Then
      await expect(
        bookmarkService.createBookmark(userId, invalidBookmarkData)
      ).rejects.toThrow(ValidationError);
    });
  });
});
```

### 통합 테스트

API 엔드포인트와 데이터베이스 상호작용을 테스트합니다.

```typescript
describe("북마크 API 통합 테스트", () => {
  let app: FastifyInstance;
  let testUser: User;
  let authToken: string;

  beforeAll(async () => {
    // 테스트용 Fastify 앱 설정
    app = await createTestApp();
    
    // 테스트 데이터베이스 초기화
    await setupTestDatabase();
  });

  beforeEach(async () => {
    // 테스트 사용자 생성 및 인증 토큰 획득
    testUser = await createTestUser();
    authToken = await generateAuthToken(testUser.id);
    
    // 테스트 데이터 초기화
    await cleanupTestData();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  describe("POST /api/bookmarks", () => {
    test("인증된 사용자가 북마크 생성 성공", async () => {
      // Given
      const bookmarkData = {
        url: "https://example.com",
        personalTitle: "테스트 북마크",
        personalNote: "테스트 노트",
        isPublic: false,
      };

      // When
      const response = await app.inject({
        method: "POST",
        url: "/api/bookmarks",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: bookmarkData,
      });

      // Then
      expect(response.statusCode).toBe(201);
      
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        url: bookmarkData.url,
        personalTitle: bookmarkData.personalTitle,
        personalNote: bookmarkData.personalNote,
        isPublic: bookmarkData.isPublic,
        userId: testUser.id,
      });

      // 데이터베이스 확인
      const savedBookmark = await prisma.bookmark.findUnique({
        where: { id: body.data.id },
      });
      expect(savedBookmark).toBeTruthy();
    });

    test("중복 URL로 북마크 생성 시 기존 메타데이터 재사용", async () => {
      // Given
      const url = "https://example.com";
      
      // 첫 번째 북마크 생성
      await app.inject({
        method: "POST",
        url: "/api/bookmarks",
        headers: { authorization: `Bearer ${authToken}` },
        payload: { url, personalTitle: "첫 번째 북마크" },
      });

      // When - 같은 URL로 두 번째 북마크 생성
      const response = await app.inject({
        method: "POST",
        url: "/api/bookmarks",
        headers: { authorization: `Bearer ${authToken}` },
        payload: { url, personalTitle: "두 번째 북마크" },
      });

      // Then
      expect(response.statusCode).toBe(201);
      
      // 웹사이트 메타데이터가 하나만 생성되었는지 확인
      const metadataCount = await prisma.websiteMetadata.count({
        where: { url },
      });
      expect(metadataCount).toBe(1);
    });
  });

  describe("GET /api/bookmarks", () => {
    test("사용자별 북마크 목록 조회", async () => {
      // Given
      const bookmarks = await createTestBookmarks(testUser.id, 3);

      // When
      const response = await app.inject({
        method: "GET",
        url: "/api/bookmarks",
        headers: { authorization: `Bearer ${authToken}` },
      });

      // Then
      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.items).toHaveLength(3);
      expect(body.data.pagination.total).toBe(3);
    });
  });
});
```

### 테스트 커버리지 관리

코드 품질을 보장하기 위한 커버리지 기준을 설정합니다.

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/config/**',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,      // 분기 커버리지 80% 이상
      functions: 80,     // 함수 커버리지 80% 이상
      lines: 80,         // 라인 커버리지 80% 이상
      statements: 80,    // 구문 커버리지 80% 이상
    },
    // 중요 모듈별 더 높은 커버리지 요구
    'src/services/**/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/repositories/**/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};

// tests/setup.ts - 테스트 설정
import { PrismaClient } from '@prisma/client';

// 테스트용 데이터베이스 설정
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

// 테스트 유틸리티 함수
export const createTestUser = async (userData?: Partial<User>): Promise<User> => {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      password: 'hashed-password',
      name: 'Test User',
      ...userData,
    },
  });
};

export const createTestBookmarks = async (
  userId: string, 
  count: number
): Promise<Bookmark[]> => {
  const bookmarks = [];
  
  for (let i = 0; i < count; i++) {
    const bookmark = await prisma.bookmark.create({
      data: {
        url: `https://example-${i}.com`,
        personalTitle: `Test Bookmark ${i}`,
        userId,
        websiteMetadataId: await getOrCreateMetadataId(`https://example-${i}.com`),
      },
    });
    bookmarks.push(bookmark);
  }
  
  return bookmarks;
};

export const cleanupTestData = async (): Promise<void> => {
  await prisma.bookmarkTag.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.websiteMetadata.deleteMany();
  await prisma.user.deleteMany();
};
```

### 테스트 명명 규칙

```typescript
// 테스트 파일 명명
// [module-name].test.ts - 단위 테스트
// [module-name].integration.test.ts - 통합 테스트
// [feature-name].e2e.test.ts - E2E 테스트

// 테스트 케이스 명명 패턴
describe("BookmarkService", () => {
  describe("createBookmark", () => {
    // 성공 케이스
    test("유효한 데이터로 북마크 생성 성공", async () => {});
    test("태그와 함께 북마크 생성 성공", async () => {});
    
    // 실패 케이스
    test("유효하지 않은 URL로 북마크 생성 실패", async () => {});
    test("권한 없는 사용자의 북마크 생성 실패", async () => {});
    
    // 경계 조건
    test("최대 길이 제한을 초과하는 제목으로 북마크 생성 실패", async () => {});
  });
});
```

이 가이드는 프로젝트의 발전과 함께 지속적으로 업데이트됩니다.
