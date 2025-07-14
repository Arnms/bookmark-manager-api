# 북마크 관리 API - API 명세서

## 개요

이 문서는 북마크 관리 시스템의 RESTful API 명세를 정의합니다. 모든 API는 JSON 형식으로 요청/응답하며, JWT 토큰 기반 인증을 사용합니다.

**기본 URL**: `http://localhost:3000/api/v1`

## 인증 방식

- **Bearer Token**: `Authorization: Bearer <JWT_TOKEN>`
- **토큰 유효기간**: 24시간 (설정 가능)
- **토큰 갱신**: 자동 갱신 없음 (재로그인 필요)

## 응답 형식 표준

### 성공 응답

```json
{
  "success": true,
  "data": {}, // 실제 데이터
  "message": "요청이 성공적으로 처리되었습니다",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 목록 응답 (페이지네이션)

```json
{
  "success": true,
  "data": {
    "items": [], // 실제 목록 데이터
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "message": "목록을 성공적으로 조회했습니다",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 에러 응답

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 유효하지 않습니다",
    "details": [
      {
        "field": "email",
        "message": "올바른 이메일 형식이 아닙니다"
      }
    ]
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## API 엔드포인트 목록

### 1. 인증 관련 API (US-001, US-002)

#### 1.1 회원가입

```
POST /auth/register
```

**요청 본문:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "name": "사용자명"
}
```

**응답:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "사용자명",
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "회원가입이 완료되었습니다"
}
```

**에러 응답:**

- `400` - 입력값 검증 실패
- `409` - 이미 존재하는 이메일

#### 1.2 로그인

```
POST /auth/login
```

**요청 본문:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

**응답:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "사용자명"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "로그인이 완료되었습니다"
}
```

**에러 응답:**

- `400` - 입력값 검증 실패
- `401` - 이메일 또는 비밀번호 불일치

#### 1.3 사용자 정보 조회

```
GET /auth/me
Authorization: Bearer <token>
```

**응답:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "사용자명",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  },
  "message": "사용자 정보를 조회했습니다"
}
```

### 2. 북마크 관리 API (US-003, US-004, US-005)

#### 2.1 북마크 생성

```
POST /bookmarks
Authorization: Bearer <token>
```

**요청 본문:**

```json
{
  "url": "https://example.com",
  "personalTitle": "개인 제목 (선택사항)",
  "personalNote": "개인 메모 (선택사항)",
  "categoryId": "category_123", // 선택사항
  "tags": ["개발", "참고자료"], // 선택사항
  "isPublic": false
}
```

**응답:**

```json
{
  "success": true,
  "data": {
    "bookmark": {
      "id": "bookmark_123",
      "url": "https://example.com",
      "personalTitle": "개인 제목",
      "personalNote": "개인 메모",
      "isPublic": false,
      "websiteMetadata": {
        "title": "Example Domain",
        "description": "This domain is for use in illustrative examples",
        "favicon": "https://example.com/favicon.ico"
      },
      "category": {
        "id": "category_123",
        "name": "개발 참고"
      },
      "tags": [
        {
          "id": "tag_123",
          "name": "개발"
        }
      ],
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  },
  "message": "북마크가 생성되었습니다"
}
```

#### 2.2 북마크 목록 조회

```
GET /bookmarks?page=1&limit=20&categoryId=category_123&tags=개발,참고자료&search=검색어&sort=createdAt&order=desc
Authorization: Bearer <token>
```

**쿼리 파라미터:**

- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 20, 최대: 100)
- `categoryId`: 카테고리 필터 (선택사항)
- `tags`: 태그 필터, 쉼표로 구분 (선택사항)
- `search`: 제목, URL, 메모에서 검색 (선택사항)
- `sort`: 정렬 기준 (createdAt, updatedAt, title) (기본값: createdAt)
- `order`: 정렬 순서 (asc, desc) (기본값: desc)
- `isPublic`: 공개 여부 필터 (선택사항)

#### 2.3 북마크 상세 조회

```
GET /bookmarks/:id
Authorization: Bearer <token>
```

#### 2.4 북마크 수정

```
PUT /bookmarks/:id
Authorization: Bearer <token>
```

**요청 본문:**

```json
{
  "personalTitle": "수정된 제목",
  "personalNote": "수정된 메모",
  "categoryId": "category_456",
  "tags": ["새태그", "수정태그"],
  "isPublic": true
}
```

#### 2.5 북마크 삭제 (소프트 삭제)

```
DELETE /bookmarks/:id
Authorization: Bearer <token>
```

### 3. 카테고리 관리 API (US-006)

#### 3.1 카테고리 생성

```
POST /categories
Authorization: Bearer <token>
```

**요청 본문:**

```json
{
  "name": "카테고리명",
  "description": "카테고리 설명 (선택사항)",
  "color": "#FF5733" // hex 색상 코드 (선택사항)
}
```

#### 3.2 카테고리 목록 조회

```
GET /categories
Authorization: Bearer <token>
```

**응답:**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "category_123",
        "name": "개발 참고",
        "description": "개발 관련 북마크",
        "color": "#FF5733",
        "bookmarkCount": 15,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  },
  "message": "카테고리 목록을 조회했습니다"
}
```

#### 3.3 카테고리 수정

```
PUT /categories/:id
Authorization: Bearer <token>
```

#### 3.4 카테고리 삭제

```
DELETE /categories/:id
Authorization: Bearer <token>
```

### 4. 태그 관리 API (US-007)

#### 4.1 태그 목록 조회

```
GET /tags?search=검색어
Authorization: Bearer <token>
```

**쿼리 파라미터:**

- `search`: 태그명 검색 (선택사항)

**응답:**

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "tag_123",
        "name": "개발",
        "bookmarkCount": 25,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  },
  "message": "태그 목록을 조회했습니다"
}
```

#### 4.2 태그 생성

```
POST /tags
Authorization: Bearer <token>
```

#### 4.3 태그 삭제

```
DELETE /tags/:id
Authorization: Bearer <token>
```

### 5. 검색 API (US-008)

#### 5.1 통합 검색

```
GET /search?q=검색어&type=all&page=1&limit=20
Authorization: Bearer <token>
```

**쿼리 파라미터:**

- `q`: 검색어 (필수)
- `type`: 검색 범위 (all, bookmarks, categories, tags) (기본값: all)
- `page`, `limit`: 페이지네이션

### 6. 통계 API (US-011)

#### 6.1 사용자 통계 조회

```
GET /stats/dashboard
Authorization: Bearer <token>
```

**응답:**

```json
{
  "success": true,
  "data": {
    "totalBookmarks": 150,
    "totalCategories": 8,
    "totalTags": 25,
    "bookmarksByCategory": [
      {
        "categoryName": "개발 참고",
        "count": 45
      }
    ],
    "recentActivity": [
      {
        "type": "bookmark_created",
        "title": "새 북마크 생성",
        "timestamp": "2025-01-01T00:00:00.000Z"
      }
    ],
    "topTags": [
      {
        "name": "JavaScript",
        "count": 30
      }
    ]
  },
  "message": "통계 정보를 조회했습니다"
}
```

## 에러 코드 정의

| 코드                  | HTTP 상태 | 설명                     |
| --------------------- | --------- | ------------------------ |
| `VALIDATION_ERROR`    | 400       | 입력값 검증 실패         |
| `UNAUTHORIZED`        | 401       | 인증 토큰 없음 또는 만료 |
| `FORBIDDEN`           | 403       | 접근 권한 없음           |
| `NOT_FOUND`           | 404       | 리소스를 찾을 수 없음    |
| `CONFLICT`            | 409       | 중복된 리소스            |
| `RATE_LIMIT_EXCEEDED` | 429       | 요청 횟수 제한 초과      |
| `INTERNAL_ERROR`      | 500       | 서버 내부 오류           |

## 보안 고려사항

1. **인증**: 모든 API는 JWT 토큰 인증 필요 (인증 API 제외)
2. **권한**: 사용자는 본인의 데이터만 접근 가능
3. **입력 검증**: 모든 입력값에 대한 엄격한 검증
4. **HTTPS**: 프로덕션 환경에서 HTTPS 필수
5. **Rate Limiting**: API 호출 횟수 제한 적용

## 다음 단계

- Fastify 스키마 정의
- 컨트롤러 및 서비스 레이어 구현
- 미들웨어 개발 (인증, 검증, 에러 처리)
- API 테스트 작성
