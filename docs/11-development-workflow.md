# 개발 워크플로우 가이드

## 개요

이 문서는 북마크 관리 API 프로젝트의 개발 워크플로우, 브랜치 전략, 코드 리뷰 프로세스, 그리고 CI/CD 파이프라인을 설명합니다.

## 브랜치 전략

### Git Flow 전략

```
main (프로덕션)
├── develop (개발 통합)
│   ├── feature/user-authentication (기능 개발)
│   ├── feature/bookmark-search (기능 개발)
│   └── feature/category-management (기능 개발)
├── release/v1.0.0 (릴리스 준비)
└── hotfix/critical-bug-fix (긴급 수정)
```

#### 브랜치 종류 및 용도

**Main Branch (main)**
- 프로덕션 환경에 배포되는 안정적인 코드
- 모든 커밋이 배포 가능한 상태
- 직접 커밋 금지, Pull Request를 통해서만 병합

**Development Branch (develop)**
- 다음 릴리스를 위한 개발 통합 브랜치
- 모든 기능 브랜치가 병합되는 곳
- 통합 테스트 수행

**Feature Branches (feature/\*)**
- 새로운 기능 개발용 브랜치
- `develop`에서 분기하여 개발 완료 후 다시 `develop`으로 병합
- 명명 규칙: `feature/기능명-간단설명`

**Release Branches (release/\*)**
- 릴리스 준비용 브랜치
- `develop`에서 분기하여 릴리스 준비 완료 후 `main`과 `develop`에 병합
- 명명 규칙: `release/v버전번호`

**Hotfix Branches (hotfix/\*)**
- 프로덕션 긴급 수정용 브랜치
- `main`에서 분기하여 수정 완료 후 `main`과 `develop`에 병합
- 명명 규칙: `hotfix/이슈설명`

### 브랜치 작업 흐름

#### 1. 새 기능 개발

```bash
# develop 브랜치에서 최신 코드 가져오기
git checkout develop
git pull origin develop

# 새 기능 브랜치 생성
git checkout -b feature/bookmark-export

# 개발 작업 수행
# ...

# 커밋 및 푸시
git add .
git commit -m "북마크 내보내기 기능 구현

- JSON 형식 내보내기 기능 추가
- CSV 형식 내보내기 기능 추가
- 내보내기 권한 검증 로직 구현"

git push origin feature/bookmark-export

# Pull Request 생성
```

#### 2. 릴리스 준비

```bash
# develop 브랜치에서 릴리스 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b release/v1.1.0

# 버전 업데이트 및 릴리스 준비
npm version minor
npm run build
npm run test

# 릴리스 노트 작성
# CHANGELOG.md 업데이트

# 릴리스 브랜치 푸시
git push origin release/v1.1.0

# main과 develop에 병합을 위한 Pull Request 생성
```

#### 3. 핫픽스 처리

```bash
# main 브랜치에서 핫픽스 브랜치 생성
git checkout main
git pull origin main
git checkout -b hotfix/auth-token-validation

# 긴급 수정 작업
# ...

# 테스트 및 커밋
npm test
git add .
git commit -m "인증 토큰 검증 로직 수정

- JWT 만료 시간 검증 추가
- 토큰 형식 유효성 검사 강화"

# main과 develop 양쪽에 병합
git checkout main
git merge hotfix/auth-token-validation
git push origin main

git checkout develop
git merge hotfix/auth-token-validation
git push origin develop

# 태그 생성
git tag v1.0.1
git push origin v1.0.1
```

## 커밋 컨벤션

### 커밋 메시지 형식

```
타입: 간단한 요약 (50자 이내)

상세한 설명 (선택사항)
- 변경사항 1
- 변경사항 2
- 변경사항 3

관련 이슈: #123
```

### 커밋 타입

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 스타일 변경 (포매팅, 세미콜론 등)
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가 또는 수정
- `chore`: 빌드 과정이나 보조 도구 변경

### 커밋 메시지 예시

```bash
# 새 기능 추가
git commit -m "feat: 북마크 태그 필터링 기능 추가

- 다중 태그 선택 기능 구현
- 태그별 북마크 개수 표시
- AND/OR 필터링 옵션 제공

관련 이슈: #45"

# 버그 수정
git commit -m "fix: 카테고리 삭제 시 북마크 정리 오류 수정

- 카테고리 삭제 시 연관된 북마크의 categoryId null 처리
- 외래키 제약조건 위반 방지
- 트랜잭션 처리로 데이터 일관성 보장"

# 리팩토링
git commit -m "refactor: 인증 미들웨어 구조 개선

- requireAuth와 authenticate 함수 통합
- 에러 메시지 일관성 개선
- 타입 안정성 강화"
```

## 코드 리뷰 프로세스

### Pull Request 작성 가이드

#### PR 템플릿

```markdown
## 변경사항 요약
<!-- 무엇을 변경했는지 간단히 설명 -->

## 변경 유형
- [ ] 새 기능 (feat)
- [ ] 버그 수정 (fix)
- [ ] 문서 업데이트 (docs)
- [ ] 리팩토링 (refactor)
- [ ] 테스트 추가/수정 (test)
- [ ] 기타 (chore)

## 상세 변경사항
<!-- 구체적인 변경사항들 나열 -->
- 변경사항 1
- 변경사항 2
- 변경사항 3

## 테스트
<!-- 어떤 테스트를 수행했는지 -->
- [ ] 단위 테스트 통과
- [ ] 통합 테스트 통과
- [ ] 수동 테스트 완료
- [ ] 성능 테스트 완료 (해당시)

## 스크린샷 (해당시)
<!-- API 응답 예시나 관련 스크린샷 -->

## 관련 이슈
<!-- 관련된 이슈 번호 -->
Closes #이슈번호

## 체크리스트
- [ ] 코딩 컨벤션 준수
- [ ] 테스트 작성/업데이트
- [ ] 문서 업데이트 (필요시)
- [ ] Breaking change 없음 (또는 문서화됨)
```

### 코드 리뷰 체크리스트

#### 리뷰어 체크사항

**기능성**
- [ ] 요구사항에 맞게 구현되었는가?
- [ ] 엣지 케이스가 고려되었는가?
- [ ] 에러 처리가 적절한가?

**코드 품질**
- [ ] 코드가 읽기 쉽고 이해하기 쉬운가?
- [ ] 변수명과 함수명이 명확한가?
- [ ] 중복 코드가 없는가?
- [ ] 복잡도가 적절한가?

**보안**
- [ ] 입력 검증이 적절한가?
- [ ] 인증/인가가 올바르게 구현되었는가?
- [ ] 민감한 정보가 노출되지 않는가?

**성능**
- [ ] 성능에 부정적인 영향이 없는가?
- [ ] 데이터베이스 쿼리가 최적화되었는가?
- [ ] 메모리 누수 가능성이 없는가?

**테스트**
- [ ] 충분한 테스트 커버리지를 가지는가?
- [ ] 테스트가 의미있는가?
- [ ] 모든 테스트가 통과하는가?

#### 리뷰 코멘트 가이드

```markdown
<!-- 좋은 리뷰 코멘트 예시 -->

# 개선 제안
💡 **제안**: 이 함수는 너무 많은 책임을 가지고 있는 것 같습니다. 
검증 로직과 비즈니스 로직을 분리하는 것이 어떨까요?

# 칭찬
👍 **칭찬**: 에러 처리가 매우 잘 되어있습니다! 
사용자에게 명확한 메시지를 제공하네요.

# 질문
❓ **질문**: 이 부분에서 await를 사용하지 않은 특별한 이유가 있나요?

# 중요한 이슈
⚠️ **중요**: 이 부분에서 SQL 인젝션 가능성이 있어 보입니다. 
매개변수화된 쿼리를 사용해주세요.

# 니트픽 (사소한 지적)
🔧 **니트**: 타입을 명시적으로 선언하면 더 좋을 것 같습니다.
```

### 리뷰 승인 기준

**자동 승인 조건**
- 모든 CI 체크 통과
- 최소 1명의 승인 (중요한 변경사항은 2명)
- 충돌 없음

**필수 리뷰 대상**
- API 인터페이스 변경
- 데이터베이스 스키마 변경
- 보안 관련 코드 변경
- 성능에 영향을 주는 변경사항

## CI/CD 파이프라인

### GitHub Actions 워크플로우

#### 1. PR 검증 워크플로우

```yaml
# .github/workflows/pr-validation.yml
name: PR Validation

on:
  pull_request:
    branches: [develop, main]

jobs:
  lint-and-format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Check Prettier formatting
        run: npm run format:check

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check

  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_USER: test_user
          POSTGRES_DB: bookmark_manager_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: npm run test:db:setup
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/bookmark_manager_test
      
      - name: Run tests
        run: npm run test:coverage
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/bookmark_manager_test
          JWT_SECRET: test-jwt-secret-key-for-testing-only
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: dist/
```

#### 2. 배포 워크플로우

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment..."
          # 스테이징 배포 스크립트 실행

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --only=production
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to production
        run: |
          echo "Deploying to production environment..."
          # 프로덕션 배포 스크립트 실행
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          PRODUCTION_URL: ${{ secrets.PRODUCTION_URL }}
```

#### 3. 보안 스캔 워크플로우

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * *'  # 매일 새벽 2시
  push:
    branches: [main, develop]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run npm audit
        run: npm audit --audit-level high
      
      - name: Run dependency check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: bookmark-manager-api
          path: .
          format: ALL
      
      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
```

### 배포 스크립트

#### 1. 스테이징 배포

```bash
#!/bin/bash
# scripts/deploy-staging.sh

set -e

echo "🚀 Starting staging deployment..."

# 환경 변수 확인
if [ -z "$STAGING_SERVER" ]; then
  echo "❌ STAGING_SERVER environment variable is not set"
  exit 1
fi

# 코드 빌드
echo "📦 Building application..."
npm run build

# Docker 이미지 빌드
echo "🐳 Building Docker image..."
docker build -t bookmark-api:staging .

# 스테이징 서버에 배포
echo "🚢 Deploying to staging server..."
docker save bookmark-api:staging | ssh $STAGING_SERVER 'docker load'

ssh $STAGING_SERVER << 'EOF'
  cd /opt/bookmark-api
  
  # 기존 컨테이너 중지
  docker-compose -f docker-compose.staging.yml down
  
  # 새 컨테이너 시작
  docker-compose -f docker-compose.staging.yml up -d
  
  # 마이그레이션 실행
  docker-compose -f docker-compose.staging.yml exec -T app npm run db:migrate
  
  # 헬스 체크
  sleep 10
  curl -f http://localhost:3000/health || exit 1
EOF

echo "✅ Staging deployment completed!"
```

#### 2. 프로덕션 배포

```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

echo "🚀 Starting production deployment..."

# 배포 전 확인사항
echo "📋 Pre-deployment checks..."

# 테스트 실행
echo "🧪 Running tests..."
npm test

# 보안 검사
echo "🔒 Running security audit..."
npm audit --audit-level high

# 데이터베이스 백업
echo "💾 Creating database backup..."
ssh $PRODUCTION_SERVER 'cd /opt/bookmark-api && ./scripts/backup-db.sh'

# 블루-그린 배포
echo "🔄 Starting blue-green deployment..."

# 새 버전 배포 (Green)
ssh $PRODUCTION_SERVER << 'EOF'
  cd /opt/bookmark-api
  
  # 새 이미지 빌드
  docker build -t bookmark-api:green .
  
  # Green 환경 시작
  docker-compose -f docker-compose.green.yml up -d
  
  # 마이그레이션 실행
  docker-compose -f docker-compose.green.yml exec -T app npm run db:migrate
  
  # 헬스 체크
  sleep 30
  curl -f http://localhost:3001/health || exit 1
  
  # 로드 밸런서 트래픽 전환
  ./scripts/switch-traffic-to-green.sh
  
  # Blue 환경 중지
  sleep 30
  docker-compose -f docker-compose.blue.yml down
  
  # Green을 Blue로 태그 변경
  docker tag bookmark-api:green bookmark-api:blue
EOF

echo "✅ Production deployment completed!"

# 배포 알림
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-type: application/json' \
  --data '{"text":"🎉 Production deployment successful!"}'
```

## 개발 환경 설정

### 로컬 개발 환경 구성

```bash
# 1. 저장소 클론
git clone https://github.com/Arnms/bookmark-manager-api.git
cd bookmark-manager-api

# 2. Node.js 버전 확인 (nvm 사용)
nvm use 18

# 3. 의존성 설치
npm install

# 4. 개발용 Git hooks 설정
npx husky install
npm run prepare

# 5. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일 편집

# 6. 데이터베이스 설정
docker-compose up -d postgres
npm run db:migrate

# 7. 개발 서버 시작
npm run dev
```

### VS Code 개발 환경

#### 권장 확장 프로그램

```json
// .vscode/extensions.json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "ms-vscode-remote.remote-containers",
    "github.copilot"
  ]
}
```

#### 워크스페이스 설정

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
```

### Git Hooks 설정

```bash
# package.json scripts에 추가
{
  "scripts": {
    "prepare": "husky install"
  }
}
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 린팅 및 포맷팅 검사
npm run lint
npm run format:check

# 타입 체크
npm run type-check

# 스테이지된 파일에 대해서만 테스트 실행
npm run test:staged
```

```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 커밋 메시지 형식 검증
npx commitlint --edit $1
```

## 이슈 및 프로젝트 관리

### GitHub Issues 템플릿

#### 버그 리포트

```markdown
---
name: 버그 리포트
about: 버그를 신고할 때 사용하세요
title: '[BUG] '
labels: bug
assignees: ''
---

## 버그 설명
<!-- 버그에 대한 명확하고 간결한 설명 -->

## 재현 단계
1. '...'로 이동
2. '....'를 클릭
3. '....'까지 스크롤
4. 오류 확인

## 예상 동작
<!-- 예상했던 동작에 대한 설명 -->

## 실제 동작
<!-- 실제로 일어난 일에 대한 설명 -->

## 스크린샷
<!-- 해당하는 경우 스크린샷 추가 -->

## 환경 정보
- OS: [e.g. macOS, Windows, Linux]
- Node.js 버전: [e.g. 18.17.0]
- 브라우저: [e.g. Chrome, Safari] (해당시)

## 추가 정보
<!-- 이 버그에 대한 기타 정보 -->
```

#### 기능 요청

```markdown
---
name: 기능 요청
about: 새로운 기능을 제안할 때 사용하세요
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## 기능 설명
<!-- 원하는 기능에 대한 명확하고 간결한 설명 -->

## 문제 상황
<!-- 이 기능 요청과 관련된 문제를 설명 -->
이 기능이 없어서 현재 ...한 문제가 있습니다.

## 제안하는 해결책
<!-- 원하는 해결책에 대한 설명 -->

## 대안
<!-- 고려해본 대안이나 기능들에 대한 설명 -->

## 추가 정보
<!-- 기능 요청에 대한 기타 정보나 스크린샷 -->
```

### 마일스톤 관리

```markdown
# v1.0.0 - MVP 릴리스
**목표 날짜**: 2025-08-15
**진행률**: 85%

## 포함 기능
- [x] 사용자 인증 시스템
- [x] 북마크 CRUD 기능
- [x] 카테고리 관리
- [x] 태그 시스템
- [x] 기본 검색 기능
- [ ] 통계 대시보드
- [ ] 데이터 내보내기

## 남은 작업
- 통계 API 구현 (#45)
- 성능 최적화 (#52)
- 문서 완성 (#58)
```

### 프로젝트 보드 구성

**열 구성:**
1. **Backlog** - 우선순위가 정해지지 않은 이슈들
2. **To Do** - 다음 스프린트에서 작업할 이슈들
3. **In Progress** - 현재 작업 중인 이슈들
4. **Review** - 코드 리뷰 중인 이슈들
5. **Testing** - QA 테스트 중인 이슈들
6. **Done** - 완료된 이슈들

## 릴리스 관리

### 버전 관리 (Semantic Versioning)

```
MAJOR.MINOR.PATCH (예: 1.2.3)

MAJOR: 호환되지 않는 API 변경
MINOR: 하위 호환되는 새 기능 추가
PATCH: 하위 호환되는 버그 수정
```

### 릴리스 프로세스

```bash
# 1. 릴리스 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b release/v1.1.0

# 2. 버전 업데이트
npm version minor  # 또는 major, patch

# 3. 릴리스 노트 작성
# CHANGELOG.md 업데이트

# 4. 테스트 실행
npm run test:all
npm run build

# 5. 릴리스 브랜치 푸시
git push origin release/v1.1.0

# 6. Pull Request 생성 (main으로)
# 7. 코드 리뷰 및 승인
# 8. main에 병합
# 9. 태그 생성 및 GitHub Release 발행

# 10. develop에도 병합
git checkout develop
git merge main
git push origin develop
```

### 릴리스 노트 템플릿

```markdown
# v1.1.0 (2025-07-15)

## 🚀 새로운 기능
- 북마크 태그 필터링 기능 추가 (#45)
- CSV 형식 데이터 내보내기 기능 구현 (#52)
- 카테고리별 통계 페이지 추가 (#58)

## 🐛 버그 수정
- 카테고리 삭제 시 북마크 정리 오류 수정 (#61)
- 검색 결과 페이지네이션 버그 해결 (#63)
- JWT 토큰 만료 처리 개선 (#65)

## 🔧 개선사항
- 데이터베이스 쿼리 성능 최적화 (#67)
- API 응답 시간 20% 개선 (#69)
- 에러 메시지 다국어 지원 (#71)

## 📚 문서
- API 명세서 업데이트 (#73)
- 배포 가이드 추가 (#75)

## 🔒 보안
- 입력 검증 로직 강화 (#77)
- Rate limiting 적용 (#79)

## ⚠️ 주요 변경사항
- `/api/search` 엔드포인트가 `/bookmarks?search=` 로 통합됨
- 카테고리 API 응답 형식 변경 (하위 호환성 유지)

## 📦 의존성 업데이트
- fastify 5.3.0 → 5.4.0
- prisma 6.10.0 → 6.11.1
- typescript 5.7.0 → 5.8.3

---

**전체 변경사항**: [v1.0.0...v1.1.0](https://github.com/Arnms/bookmark-manager-api/compare/v1.0.0...v1.1.0)
```

이 개발 워크플로우는 팀의 성장과 프로젝트 규모에 따라 지속적으로 조정될 수 있습니다.