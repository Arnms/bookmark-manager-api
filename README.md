# 북마크 관리 API

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.2.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.4.0-black.svg)](https://www.fastify.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.11.1-2D3748.svg)](https://www.prisma.io/)

RESTful API + JWT 인증을 활용한 개인용 북마크 관리 시스템

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [빠른 시작](#빠른-시작)
- [API 문서](#api-문서)
- [개발 가이드](#개발-가이드)
- [배포](#배포)
- [기여하기](#기여하기)
- [라이선스](#라이선스)

## 🎯 프로젝트 개요

이 프로젝트는 웹 개발자와 지식 근로자들을 위한 체계적인 북마크 관리 솔루션입니다. 크로스 디바이스 접근, 검색 기능, 개인 메모 등의 기능을 제공합니다.

### 대상 사용자
- 웹 개발자
- 지식 근로자
- 체계적인 북마크 관리가 필요한 모든 사용자

### 핵심 가치
- **체계적 분류**: 카테고리와 태그를 통한 이중 분류 시스템
- **강력한 검색**: 제목, URL, 메모, 태그 전체 검색
- **개인화**: 각 북마크에 개인 메모와 제목 추가 가능
- **접근성**: RESTful API를 통한 다양한 클라이언트 지원

## ⭐ 주요 기능

### 완료된 기능 ✅

#### 인증 및 사용자 관리
- [x] JWT 기반 사용자 인증
- [x] 회원가입 / 로그인
- [x] 비밀번호 암호화 (bcrypt)

#### 북마크 관리
- [x] 북마크 CRUD 작업
- [x] 웹사이트 메타데이터 자동 캐싱
- [x] 개인 제목 및 메모 추가
- [x] 공개/비공개 설정
- [x] 소프트 삭제 지원

#### 분류 시스템
- [x] 카테고리 관리 (계층형 구조)
- [x] 태그 시스템 (다중 태그 지원)
- [x] 카테고리-태그 조합 필터링

#### 검색 및 조회
- [x] 통합 검색 (제목, URL, 메모, 태그)
- [x] 페이지네이션
- [x] 필터링 (카테고리, 태그, 공개여부)

### 개발 예정 기능 🚧

- [ ] 정렬 기능 (제목, 날짜 등)
- [ ] 사용자 통계 대시보드
- [ ] 북마크 가져오기/내보내기
- [ ] 태그 자동 추천
- [ ] 중복 북마크 감지

## 🛠 기술 스택

### Backend
- **Framework**: Fastify 5.4.0
- **Runtime**: Node.js 18.2.0+
- **Language**: TypeScript 5.8.3

### Database
- **Database**: PostgreSQL 15
- **ORM**: Prisma 6.11.1
- **Migration**: Prisma Migrate

### Authentication & Security
- **JWT**: @fastify/jwt
- **Password**: bcrypt
- **Validation**: Zod + TypeBox
- **Security**: Helmet, CORS, Rate Limiting

### Development & Testing
- **Testing**: Jest + Supertest
- **Linting**: ESLint + Prettier
- **Process**: tsx (TypeScript execution)
- **Containerization**: Docker + Docker Compose

### Documentation
- **API Docs**: 상세 명세서 제공
- **Code Docs**: JSDoc + TypeScript types

## 🚀 빠른 시작

### 필수 요구사항

- Node.js 18.2.0 이상
- PostgreSQL 15
- Docker & Docker Compose (권장)

### 1. 프로젝트 클론

```bash
git clone https://github.com/Arnms/bookmark-manager-api.git
cd bookmark-manager-api
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 설정

```bash
# 환경 변수 파일 생성
cp .env.example .env

# .env 파일 편집 (데이터베이스 연결 정보 등)
nano .env
```

### 4. 데이터베이스 설정

#### Option A: Docker 사용 (권장)

```bash
# PostgreSQL 컨테이너 시작
docker-compose up -d postgres

# 데이터베이스 마이그레이션
npm run db:migrate
```

#### Option B: 로컬 PostgreSQL 사용

```bash
# PostgreSQL 설치 후 데이터베이스 생성
createdb bookmark_manager

# 마이그레이션 실행
npm run db:migrate
```

### 5. 개발 서버 실행

```bash
# 개발 모드 실행
npm run dev

# 서버가 http://localhost:3000 에서 실행됩니다
```

### 6. 기본 사용법

```bash
# 회원가입
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# 로그인
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 북마크 생성 (JWT 토큰 필요)
curl -X POST http://localhost:3000/bookmarks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","personalTitle":"예시 사이트"}'
```

## 📚 API 문서

### 주요 엔드포인트

- **Base URL**: `http://localhost:3000`
- **Authentication**: Bearer Token (JWT)

#### 인증
- `POST /auth/register` - 회원가입
- `POST /auth/login` - 로그인
- `GET /auth/me` - 사용자 정보 조회

#### 북마크
- `GET /bookmarks` - 북마크 목록 조회
- `POST /bookmarks` - 북마크 생성
- `GET /bookmarks/:id` - 북마크 상세 조회
- `PUT /bookmarks/:id` - 북마크 수정
- `DELETE /bookmarks/:id` - 북마크 삭제

#### 카테고리
- `GET /categories` - 카테고리 목록 조회
- `POST /categories` - 카테고리 생성
- `PUT /categories/:id` - 카테고리 수정
- `DELETE /categories/:id` - 카테고리 삭제

#### 태그
- `GET /tags` - 태그 목록 조회
- `POST /tags` - 태그 생성
- `PUT /tags/:id` - 태그 수정
- `DELETE /tags/:id` - 태그 삭제

### 상세 API 문서

전체 API 명세는 [`docs/05-api-specification.md`](./docs/05-api-specification.md)를 참조하세요.

## 💻 개발 가이드

### 개발 명령어

```bash
# 개발 서버 시작 (hot reload)
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start

# 테스트 실행
npm test

# 테스트 (watch mode)
npm run test:watch

# 테스트 커버리지
npm run test:coverage

# 코드 린팅
npx eslint .

# 코드 포매팅
npx prettier --write .

# 데이터베이스 관련
npm run db:generate    # Prisma 클라이언트 생성
npm run db:migrate     # 마이그레이션 실행
npm run db:studio      # Prisma Studio 실행
npm run db:reset       # 데이터베이스 리셋
```

### 환경 변수

```env
# 데이터베이스
DATABASE_URL="postgresql://username:password@localhost:5432/bookmark_manager"

# JWT 설정
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="24h"

# 서버 설정
PORT=3000
NODE_ENV="development"

# 로그 설정
LOG_LEVEL="info"

# CORS 설정
CORS_ORIGIN="http://localhost:3000"
```

### 프로젝트 구조

```
bookmark-manager-api/
├── src/
│   ├── config/          # 설정 파일
│   ├── middleware/      # 미들웨어
│   ├── routes/          # API 라우트
│   ├── utils/           # 유틸리티 함수
│   ├── app.ts           # Fastify 앱 설정
│   └── index.ts         # 진입점
├── prisma/
│   ├── schema.prisma    # 데이터베이스 스키마
│   └── migrations/      # 마이그레이션 파일
├── tests/               # 테스트 파일
├── docs/                # 문서
└── docker-compose.yml   # Docker 설정
```

### 테스트

이 프로젝트는 PostgreSQL 기반의 테스트 환경을 사용합니다.

```bash
# 테스트 데이터베이스 설정
docker-compose up -d postgres-test
npm run test:db:setup

# 테스트 실행
npm test

# 커버리지 확인
npm run test:coverage
```

자세한 테스트 가이드는 [`docs/07-api-testing.md`](./docs/07-api-testing.md)를 참조하세요.

## 🐳 배포

### Docker를 사용한 배포

```bash
# 전체 스택 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 서비스 중지
docker-compose down
```

### 프로덕션 배포

자세한 배포 가이드는 [`docs/10-deployment.md`](./docs/10-deployment.md)를 참조하세요.

## 📖 문서

- [API 명세서](./docs/05-api-specification.md)
- [테스트 가이드](./docs/07-api-testing.md)
- [테스트 환경 설정](./docs/08-test-setup.md)
- [아키텍처 가이드](./docs/09-architecture.md)
- [배포 가이드](./docs/10-deployment.md)
- [보안 가이드](./docs/13-security.md)

## 🤝 기여하기

1. 이 저장소를 Fork 합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push 합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

### 개발 가이드라인

- TypeScript strict 모드 준수
- ESLint 및 Prettier 규칙 따르기
- 테스트 커버리지 80% 이상 유지
- 커밋 메시지는 한국어로 작성
- API 변경 시 문서 업데이트 필수

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🔗 관련 링크

- [GitHub Repository](https://github.com/Arnms/bookmark-manager-api)
- [Issue Tracker](https://github.com/Arnms/bookmark-manager-api/issues)
- [Changelog](CHANGELOG.md)

## 📞 지원

문제가 발생하거나 질문이 있으시면:

1. [Issues](https://github.com/Arnms/bookmark-manager-api/issues)에서 기존 이슈 확인
2. 새로운 이슈 생성
3. 이메일 문의: [contact@example.com](mailto:contact@example.com)

---

**개발자**: [Arnms](https://github.com/Arnms)  
**프로젝트 시작**: 2025년  
**최종 업데이트**: 2025년 7월