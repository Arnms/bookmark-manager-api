# 테스트 환경 설정 가이드

## 개요

이 문서는 PostgreSQL 기반의 테스트 환경 설정 방법을 설명합니다. 개발 환경과 테스트 환경이 동일한 PostgreSQL을 사용하여 데이터베이스 호환성 문제를 방지합니다.

## 환경 구성

### 1. 데이터베이스 설정

**개발 환경**: PostgreSQL (localhost:5432)
**테스트 환경**: PostgreSQL (localhost:5433)

### 2. Docker Compose 설정

```yaml
services:
  postgres:
    # 개발용 데이터베이스 (5432 포트)
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  postgres-test:
    # 테스트용 데이터베이스 (5433 포트)
    ports:
      - '5433:5432'
    tmpfs:
      - /var/lib/postgresql/data  # 메모리 기반 임시 스토리지
```

## 테스트 실행 방법

### 1. 데이터베이스 컨테이너 시작

```bash
# 개발 및 테스트 데이터베이스 모두 시작
docker-compose up -d

# 또는 테스트 데이터베이스만 시작
docker-compose up -d postgres-test
```

### 2. 환경 변수 설정

**.env 파일 생성** (`.env.example` 참고):

```env
# 개발 데이터베이스
DATABASE_URL="postgresql://bookmark_user:bookmark_password@localhost:5432/bookmark_manager"

# 테스트 데이터베이스
TEST_DATABASE_URL="postgresql://bookmark_user:bookmark_password@localhost:5433/bookmark_manager_test"

NODE_ENV="development"
```

### 3. 테스트 데이터베이스 마이그레이션

```bash
# 테스트 데이터베이스 스키마 생성
npm run test:db:setup
```

### 4. 테스트 실행

```bash
# 전체 테스트 실행
npm test

# 특정 테스트 실행
npm test -- tests/categories.test.ts

# 테스트 커버리지 확인
npm run test:coverage

# 테스트 감시 모드
npm run test:watch
```

## 테스트 환경 특징

### 1. 자동 데이터 정리

- 각 테스트 전후에 모든 테이블 데이터 자동 정리
- 외래키 제약조건 순서 고려한 안전한 정리

### 2. 환경 격리

- 개발 환경과 테스트 환경 완전 분리
- 테스트 실행 시 개발 데이터에 영향 없음

### 3. 메모리 기반 스토리지

- 테스트 DB는 tmpfs 사용으로 빠른 성능
- 컨테이너 재시작 시 자동 초기화

## 문제 해결

### 1. 데이터베이스 연결 실패

```bash
# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs postgres-test

# 컨테이너 재시작
docker-compose restart postgres-test
```

### 2. 마이그레이션 실패

```bash
# 테스트 DB 리셋
docker-compose down postgres-test
docker-compose up -d postgres-test

# 마이그레이션 재실행
npm run test:db:setup
```

### 3. 포트 충돌

```bash
# 포트 사용 확인
lsof -i :5433

# 다른 포트 사용 (docker-compose.yml 수정)
ports:
  - '5434:5432'
```

## PostgreSQL vs SQLite 차이점 해결

### 1. 대소문자 구분 검색

**PostgreSQL (권장)**:
```typescript
where: {
  name: {
    contains: search,
    mode: 'insensitive'  // 대소문자 구분 안함
  }
}
```

**SQLite (이전 방식)**:
```typescript
where: {
  name: {
    contains: search  // mode 옵션 미지원
  }
}
```

### 2. 데이터 타입 호환성

- **UUID**: PostgreSQL은 네이티브 UUID 타입 지원
- **JSON**: PostgreSQL은 JSON/JSONB 타입 지원
- **날짜/시간**: PostgreSQL은 더 정확한 타임스탬프 처리

### 3. 제약조건 처리

- **Foreign Key**: PostgreSQL은 더 엄격한 외래키 제약조건
- **Unique 제약**: PostgreSQL은 더 나은 에러 메시지 제공

## 성능 최적화

### 1. 테스트 속도 향상

```typescript
// 테스트 간 데이터 정리를 위한 TRUNCATE 사용
await prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE`;
```

### 2. 병렬 테스트 실행

```bash
# Jest 병렬 실행 설정
npm test -- --maxWorkers=4
```

### 3. 테스트 데이터베이스 풀링

```typescript
// Prisma 연결 풀 최적화
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: testDatabaseUrl
    }
  }
});
```

## 권장 사항

1. **항상 PostgreSQL 사용**: 개발과 테스트 환경 통일
2. **격리된 테스트 DB**: 테스트 전용 데이터베이스 사용
3. **자동 정리**: 각 테스트 후 데이터 자동 정리
4. **환경 변수 검증**: 테스트 환경에서만 실행되도록 검증
5. **마이그레이션 동기화**: 개발 DB와 테스트 DB 스키마 동기화

## 다음 단계

1. CI/CD 파이프라인에 PostgreSQL 테스트 환경 구성
2. 테스트 데이터 팩토리 패턴 도입
3. 성능 테스트 및 로드 테스트 추가
4. 테스트 커버리지 90% 이상 달성