# 데이터베이스 설정 가이드

## Docker를 사용할 수 없는 경우의 대안

현재 환경에서 Docker가 WSL2에서 활성화되지 않았습니다. 다음 대안 중 하나를 선택해주세요:

### 옵션 1: Docker Desktop WSL2 통합 활성화

1. Docker Desktop을 열고 Settings → Resources → WSL Integration으로 이동
2. "Enable integration with my default WSL distro" 체크
3. 사용 중인 WSL2 배포판 활성화
4. Docker Desktop 재시작

### 옵션 2: 로컬 PostgreSQL 설치

```bash
# Ubuntu/Debian에서 PostgreSQL 설치
sudo apt update
sudo apt install postgresql postgresql-contrib

# PostgreSQL 서비스 시작
sudo service postgresql start

# 사용자 생성 및 데이터베이스 설정
sudo -u postgres psql
CREATE USER bookmark_user WITH PASSWORD 'bookmark_password';
CREATE DATABASE bookmark_manager OWNER bookmark_user;
GRANT ALL PRIVILEGES ON DATABASE bookmark_manager TO bookmark_user;
\q
```

**환경변수 수정:**

```env
DATABASE_URL="postgresql://bookmark_user:bookmark_password@localhost:5432/bookmark_manager"
```

### 옵션 3: 클라우드 PostgreSQL 사용

**무료 클라우드 서비스:**

- [ElephantSQL](https://www.elephantsql.com/) - 무료 20MB 제한
- [Aiven](https://aiven.io/) - 무료 1개월 체험
- [Neon](https://neon.tech/) - 무료 PostgreSQL

### 옵션 4: SQLite 사용 (개발용)

개발 초기에는 SQLite를 사용할 수도 있습니다:

**Prisma 스키마 수정:**

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

**환경변수 수정:**

```env
DATABASE_URL="file:./dev.db"
```

## 다음 단계

데이터베이스 설정을 완료하신 후:

1. `npx prisma generate` - Prisma 클라이언트 생성
2. `npx prisma migrate dev --name init` - 초기 마이그레이션 실행
3. `npm run dev` - 서버 실행 테스트
