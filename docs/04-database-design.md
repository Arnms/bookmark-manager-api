# 북마크 관리 서비스 - 데이터베이스 설계서

## 프로젝트 개요

- **프로젝트명**: bookmark-manager-api
- **데이터베이스**: PostgreSQL
- **ORM**: Prisma

## ERD 개요

### 엔티티 관계

```
User (1) ----< Category (N)
User (1) ----< Bookmark (N)
User (1) ----< Tag (N)
Category (1) ----< Bookmark (N) [Optional]
WebsiteMetadata (1) ----< Bookmark (N)
Bookmark (N) ----< BookmarkTag (N) >---- Tag (N)
```

## 테이블 상세 설계

### 1. User (사용자)

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**컬럼 설명:**

- `id`: 사용자 고유 ID (Auto Increment)
- `email`: 로그인용 이메일 (유니크)
- `password`: bcrypt 해시된 비밀번호
- `name`: 사용자 표시명

**인덱스:**

- `email` (UNIQUE, 로그인 성능)

### 2. Category (카테고리)

```sql
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- hex color code (#FFFFFF)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);
```

**컬럼 설명:**

- `user_id`: 카테고리 소유자
- `name`: 카테고리명 (사용자별 유니크)
- `description`: 카테고리 설명 (선택사항)
- `color`: UI 표시용 색상 (선택사항, hex 코드)

**인덱스:**

- `user_id` (사용자별 카테고리 조회)
- `(user_id, name)` (UNIQUE 제약조건)

### 3. WebsiteMetadata (웹사이트 메타데이터)

```sql
CREATE TABLE website_metadata (
    id BIGSERIAL PRIMARY KEY,
    url VARCHAR(2048) UNIQUE NOT NULL,
    title VARCHAR(500),
    description TEXT,
    favicon TEXT,
    image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**컬럼 설명:**

- `url`: 웹사이트 URL (유니크, 최대 2048자)
- `title`: 웹사이트 제목 (자동 추출)
- `description`: 웹사이트 설명 (meta description)
- `favicon`: 파비콘 URL
- `image`: 대표 이미지 URL (og:image)

**인덱스:**

- `url` (UNIQUE, URL 기반 조회)

### 4. Bookmark (북마크)

```sql
CREATE TABLE bookmarks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    website_metadata_id BIGINT NOT NULL,
    category_id BIGINT,
    personal_title VARCHAR(500),
    personal_note TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (website_metadata_id) REFERENCES website_metadata(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

**컬럼 설명:**

- `user_id`: 북마크 소유자
- `website_metadata_id`: 연결된 웹사이트 메타데이터
- `category_id`: 소속 카테고리 (선택사항)
- `personal_title`: 사용자 지정 제목 (원본 제목과 별도)
- `personal_note`: 개인 메모
- `is_public`: 공개/비공개 설정

**인덱스:**

- `user_id` (사용자별 북마크 조회)
- `category_id` (카테고리별 북마크 조회)
- `(user_id, created_at)` (최신 북마크 조회)
- `is_public` (공개 북마크 조회)

### 5. Tag (태그)

```sql
CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);
```

**컬럼 설명:**

- `user_id`: 태그 소유자 (사용자별 태그)
- `name`: 태그명 (사용자별 유니크)

**인덱스:**

- `user_id` (사용자별 태그 조회)
- `(user_id, name)` (UNIQUE 제약조건)

### 6. BookmarkTag (북마크-태그 연결)

```sql
CREATE TABLE bookmark_tags (
    bookmark_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (bookmark_id, tag_id),
    FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

**컬럼 설명:**

- `bookmark_id`: 북마크 ID
- `tag_id`: 태그 ID
- 복합 Primary Key로 중복 방지

**인덱스:**

- `bookmark_id` (북마크별 태그 조회)
- `tag_id` (태그별 북마크 조회)

## 비즈니스 규칙

### 데이터 무결성 규칙

1. **사용자별 데이터 격리**: 모든 사용자 데이터는 user_id로 격리
2. **카테고리명 유니크**: 같은 사용자 내에서 카테고리명 중복 불가
3. **태그명 유니크**: 같은 사용자 내에서 태그명 중복 불가
4. **URL 유니크**: 동일 URL의 메타데이터는 하나만 존재

### 삭제 정책

- **CASCADE**: User 삭제 시 모든 관련 데이터 삭제
- **SET NULL**: Category 삭제 시 Bookmark의 category_id만 NULL 처리
- **CASCADE**: WebsiteMetadata 삭제 시 관련 Bookmark 삭제

### 성능 최적화

1. **인덱스 전략**: 자주 조회되는 컬럼에 인덱스 설정
2. **페이지네이션**: created_at 기준 인덱스로 효율적 페이징
3. **검색 최적화**: 향후 Full-text search 도입 고려

## Prisma 스키마 고려사항

### 모델 관계 정의

- User → Category: 1:N
- User → Bookmark: 1:N
- User → Tag: 1:N
- Category → Bookmark: 1:N (optional)
- WebsiteMetadata → Bookmark: 1:N
- Bookmark ↔ Tag: N:M (through BookmarkTag)

### 스키마 특징

- snake_case 컬럼명 (PostgreSQL 관례)
- camelCase 모델명 (Prisma/TypeScript 관례)
- 자동 타임스탬프 관리
- 관계 필드의 적절한 onDelete 설정

## 확장성 고려사항

### 향후 추가 가능한 기능

1. **북마크 공유**: SharedBookmark 테이블 추가
2. **컬렉션**: BookmarkCollection 테이블 추가
3. **팀 기능**: Organization, Team 테이블 추가
4. **북마크 이력**: BookmarkHistory 테이블 추가

### 스키마 마이그레이션 전략

- 점진적 스키마 변경 지원
- 기존 데이터 호환성 유지
- 인덱스 추가/삭제 시 성능 영향 최소화

## 다음 단계

- Prisma 스키마 파일 작성
- 초기 마이그레이션 생성
- 시드 데이터 정의
