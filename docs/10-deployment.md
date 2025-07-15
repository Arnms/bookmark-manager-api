# 배포 가이드

## 개요

이 문서는 북마크 관리 API의 다양한 환경으로의 배포 방법을 설명합니다.

## 배포 환경별 가이드

### 로컬 개발 환경

#### 필수 요구사항
- Node.js 18.2.0 이상
- PostgreSQL 15
- Docker & Docker Compose (권장)

#### 설정 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/Arnms/bookmark-manager-api.git
cd bookmark-manager-api

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 4. 데이터베이스 시작 (Docker 사용)
docker-compose up -d postgres

# 5. 데이터베이스 마이그레이션
npm run db:migrate

# 6. 개발 서버 시작
npm run dev
```

### 스테이징 환경

#### Docker를 이용한 배포

```bash
# docker-compose.staging.yml 생성
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: staging
      DATABASE_URL: "postgresql://user:pass@postgres:5432/bookmark_staging"
      JWT_SECRET: "staging-secret-key"
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: bookmark_staging
      POSTGRES_USER: bookmark_user
      POSTGRES_PASSWORD: staging_password
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_staging_data:
```

```bash
# 스테이징 환경 배포
docker-compose -f docker-compose.staging.yml up -d

# 마이그레이션 실행
docker-compose -f docker-compose.staging.yml exec app npm run db:migrate
```

### 프로덕션 환경

#### 1. Docker를 이용한 프로덕션 배포

##### Dockerfile 최적화

```dockerfile
# 멀티 스테이지 빌드로 이미지 크기 최적화
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

FROM node:18-alpine AS production

# 보안을 위한 non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# 프로덕션 의존성만 복사
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# 파일 소유권 변경
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

# Health check 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
```

##### 프로덕션 docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: "postgresql://bookmark_user:${DB_PASSWORD}@postgres:5432/bookmark_manager"
      JWT_SECRET: "${JWT_SECRET}"
      LOG_LEVEL: "info"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: bookmark_manager
      POSTGRES_USER: bookmark_user
      POSTGRES_PASSWORD: "${DB_PASSWORD}"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bookmark_user -d bookmark_manager"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

##### 환경 변수 관리

```bash
# .env.production 파일 생성
NODE_ENV=production
PORT=3000

# 데이터베이스 설정
DATABASE_URL="postgresql://bookmark_user:STRONG_PASSWORD@localhost:5432/bookmark_manager"

# JWT 설정 (32자 이상의 강력한 키)
JWT_SECRET="your-super-strong-jwt-secret-key-for-production-use-32-chars-minimum"
JWT_EXPIRES_IN="24h"

# 로그 설정
LOG_LEVEL="warn"

# CORS 설정 (실제 도메인으로 변경)
CORS_ORIGIN="https://yourdomain.com"

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# SSL 및 보안
FORCE_HTTPS=true
SECURE_COOKIES=true
```

#### 2. 클라우드 배포

##### AWS EC2 배포

```bash
# 1. EC2 인스턴스 생성 및 연결
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. 필수 소프트웨어 설치
sudo apt update
sudo apt install -y docker.io docker-compose nginx certbot

# 3. Docker 권한 설정
sudo usermod -aG docker ubuntu
newgrp docker

# 4. 애플리케이션 배포
git clone https://github.com/Arnms/bookmark-manager-api.git
cd bookmark-manager-api

# 5. 환경 변수 설정
cp .env.example .env.production
nano .env.production

# 6. SSL 인증서 생성
sudo certbot certonly --standalone -d yourdomain.com

# 7. 프로덕션 배포
docker-compose -f docker-compose.production.yml up -d
```

##### Google Cloud Platform 배포

```bash
# 1. Google Cloud SDK 설치 및 인증
gcloud auth login
gcloud config set project your-project-id

# 2. Cloud SQL PostgreSQL 인스턴스 생성
gcloud sql instances create bookmark-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-northeast1

# 3. 데이터베이스 생성
gcloud sql databases create bookmark_manager --instance=bookmark-db

# 4. 사용자 생성
gcloud sql users create bookmark_user \
  --instance=bookmark-db \
  --password=strong-password

# 5. Cloud Run으로 배포
gcloud run deploy bookmark-api \
  --image gcr.io/your-project-id/bookmark-api \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated
```

##### Heroku 배포

```bash
# 1. Heroku CLI 설치 및 로그인
heroku login

# 2. 애플리케이션 생성
heroku create your-app-name

# 3. PostgreSQL 애드온 추가
heroku addons:create heroku-postgresql:mini

# 4. 환경 변수 설정
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET="your-strong-secret-key"

# 5. 배포
git push heroku main

# 6. 데이터베이스 마이그레이션
heroku run npm run db:migrate
```

## Nginx 설정

### nginx.conf 예제

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        
        # HTTPS로 리다이렉트
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL 설정
        ssl_certificate /etc/ssl/certs/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

        # 보안 헤더
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # Rate limiting 적용
        limit_req zone=api burst=20 nodelay;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # 타임아웃 설정
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Health check 엔드포인트
        location /health {
            proxy_pass http://app;
            access_log off;
        }

        # 정적 파일 캐싱 (필요시)
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## 데이터베이스 관리

### 백업 전략

#### 자동 백업 스크립트

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="bookmark_manager"
DB_USER="bookmark_user"

# 백업 실행
pg_dump -h postgres -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# 30일 이상 된 백업 파일 삭제
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql"
```

#### 크론탭 설정

```bash
# 매일 새벽 2시에 백업 실행
0 2 * * * /path/to/backup.sh
```

### 마이그레이션 관리

#### 프로덕션 마이그레이션 절차

```bash
# 1. 백업 생성
npm run db:backup

# 2. 마이그레이션 실행 (다운타임 발생)
npm run db:migrate

# 3. 애플리케이션 재시작
docker-compose restart app

# 4. 헬스 체크
curl -f http://localhost:3000/health
```

## 모니터링 및 로깅

### 로그 수집

#### Docker 로그 설정

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### 구조화된 로깅

```typescript
// src/config/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  } : undefined
});
```

### Health Check 엔드포인트

```typescript
// src/routes/health.ts
export default async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (request, reply) => {
    try {
      // 데이터베이스 연결 확인
      await prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version
      };
    } catch (error) {
      reply.status(503);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  });
}
```

## 성능 최적화

### 프로덕션 최적화 설정

```typescript
// src/app.ts
export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: env.LOG_LEVEL,
      // 프로덕션에서는 단순한 로그 형식 사용
      ...(env.NODE_ENV === 'production' && {
        serializers: {
          req: () => undefined,
          res: () => undefined
        }
      })
    },
    // 프로덕션 최적화
    ...(env.NODE_ENV === 'production' && {
      trustProxy: true,
      disableRequestLogging: true
    })
  });

  // 프로덕션에서만 압축 활성화
  if (env.NODE_ENV === 'production') {
    await app.register(require('@fastify/compress'));
  }

  return app;
}
```

### 데이터베이스 연결 풀 최적화

```typescript
// src/config/database.ts
const createPrismaClient = () => {
  return new PrismaClient({
    log: env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    // 프로덕션 연결 풀 설정
    ...(env.NODE_ENV === 'production' && {
      connectionLimit: 10,
      poolTimeout: 20,
      socketTimeout: 60,
    })
  });
};
```

## 보안 강화

### 프로덕션 보안 체크리스트

- [ ] HTTPS 강제 적용
- [ ] 강력한 JWT 시크릿 키 사용
- [ ] 데이터베이스 비밀번호 강화
- [ ] Rate Limiting 적용
- [ ] CORS 정책 설정
- [ ] 보안 헤더 적용
- [ ] 입력값 검증 강화
- [ ] 민감한 정보 로그 제외
- [ ] 정기적인 의존성 업데이트
- [ ] 보안 스캔 도구 적용

### 환경별 보안 설정

```typescript
// src/config/security.ts
export const getSecurityConfig = () => {
  const isProd = process.env.NODE_ENV === 'production';
  
  return {
    cors: {
      origin: isProd ? process.env.CORS_ORIGIN : true,
      credentials: true
    },
    helmet: {
      contentSecurityPolicy: isProd,
      hsts: isProd,
    },
    rateLimit: {
      max: isProd ? 100 : 1000,
      timeWindow: '15 minutes'
    }
  };
};
```

## 트러블슈팅

### 자주 발생하는 문제

#### 1. 데이터베이스 연결 실패

```bash
# 연결 상태 확인
docker-compose logs postgres

# 연결 테스트
docker-compose exec postgres pg_isready -U bookmark_user -d bookmark_manager
```

#### 2. 메모리 부족

```bash
# 메모리 사용량 확인
docker stats

# 컨테이너 메모리 제한 설정
docker-compose.yml에 deploy.resources.limits.memory 설정
```

#### 3. SSL 인증서 문제

```bash
# 인증서 갱신
sudo certbot renew

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### 롤백 절차

```bash
# 1. 이전 버전으로 롤백
git checkout previous-stable-tag

# 2. 컨테이너 재빌드
docker-compose build app

# 3. 서비스 재시작
docker-compose up -d app

# 4. 헬스 체크
curl -f https://yourdomain.com/health
```

이 배포 가이드는 프로젝트의 성장에 따라 지속적으로 업데이트될 예정입니다.