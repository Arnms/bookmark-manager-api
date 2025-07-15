# 보안 가이드

## 개요

이 문서는 북마크 관리 API의 보안 구현 현황과 보안 강화 방안을 설명합니다.

## 현재 보안 구현 현황

### ✅ 구현된 보안 기능

#### 1. 인증 및 인가 (Authentication & Authorization)

**JWT 기반 인증**
```typescript
// src/middleware/auth.ts
export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return reply.status(401).send({ error: '인증 토큰이 필요합니다' });
    }

    const decoded = request.server.jwt.verify(token) as JWTPayload;
    request.user = { id: decoded.userId, email: decoded.email };
  } catch (error) {
    return reply.status(401).send({ error: '유효하지 않은 토큰입니다' });
  }
};
```

**사용자별 데이터 격리**
```typescript
// 모든 데이터 조회 시 사용자 ID로 필터링
const bookmarks = await prisma.bookmark.findMany({
  where: {
    userId: request.user.id,  // 현재 사용자의 데이터만 조회
    deletedAt: null
  }
});
```

#### 2. 비밀번호 보안

**bcrypt를 이용한 비밀번호 해싱**
```typescript
// src/utils/auth.ts
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;  // 충분한 솔트 라운드
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
```

#### 3. 입력 검증

**Zod 스키마 검증**
```typescript
// 엄격한 입력 검증
const registerSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요'),
  password: z.string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '비밀번호는 대소문자와 숫자를 포함해야 합니다'),
  name: z.string().min(1, '이름을 입력하세요').max(100, '이름은 100자를 초과할 수 없습니다')
});
```

#### 4. 보안 헤더

**Helmet 미들웨어 적용**
```typescript
// src/app.ts
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});
```

#### 5. CORS 정책

**적절한 CORS 설정**
```typescript
await app.register(cors, {
  origin: env.NODE_ENV === 'production' 
    ? [env.CORS_ORIGIN] 
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

#### 6. Rate Limiting

**요청 빈도 제한**
```typescript
await app.register(rateLimit, {
  max: env.RATE_LIMIT_MAX,
  timeWindow: env.RATE_LIMIT_WINDOW_MS,
  errorResponseBuilder: () => ({
    error: '너무 많은 요청입니다. 잠시 후 다시 시도하세요.',
    statusCode: 429
  })
});
```

## 보안 위협 분석 및 대응

### 1. 인증 및 인가 관련 위협

#### 위협: JWT 토큰 탈취
**현재 대응책:**
- HTTPS 전송 강제
- 토큰 만료 시간 설정 (24시간)
- httpOnly 쿠키 사용 검토 필요

**추가 보안 강화:**
```typescript
// Refresh Token 패턴 도입
interface TokenPair {
  accessToken: string;   // 15분 만료
  refreshToken: string;  // 7일 만료, httpOnly 쿠키
}

export const generateTokenPair = (userId: string): TokenPair => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};
```

#### 위협: 권한 승격 (Privilege Escalation)
**현재 대응책:**
- 모든 요청에서 사용자 ID 검증
- 데이터베이스 쿼리에 사용자 필터 강제

**추가 보안 강화:**
```typescript
// 역할 기반 접근 제어 (RBAC) 도입
enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export const requireRole = (role: UserRole) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user.role !== role) {
      return reply.status(403).send({ error: '권한이 없습니다' });
    }
  };
};
```

### 2. 데이터 보안 위협

#### 위협: SQL 인젝션
**현재 대응책:**
- Prisma ORM 사용으로 기본적인 SQL 인젝션 방지
- 모든 쿼리가 매개변수화됨

**추가 보안 강화:**
```typescript
// Raw 쿼리 사용 시 주의사항
const searchBookmarks = async (userId: string, searchTerm: string) => {
  // ❌ 위험한 방식
  // const result = await prisma.$queryRaw`
  //   SELECT * FROM bookmarks WHERE userId = ${userId} AND title LIKE '%${searchTerm}%'
  // `;
  
  // ✅ 안전한 방식
  const result = await prisma.$queryRaw`
    SELECT * FROM bookmarks 
    WHERE userId = ${userId} AND title ILIKE ${`%${searchTerm}%`}
  `;
  
  return result;
};
```

#### 위협: 민감한 데이터 노출
**현재 대응책:**
- 비밀번호 해시만 저장
- 응답에서 민감한 필드 제외

**추가 보안 강화:**
```typescript
// 응답 데이터 직렬화 시 민감한 정보 제거
export const sanitizeUser = (user: User) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

// 데이터베이스 레벨에서 민감한 데이터 암호화
export const encryptSensitiveData = (data: string): string => {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from('bookmark-api', 'utf8'));
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};
```

### 3. 네트워크 보안 위협

#### 위협: 중간자 공격 (MITM)
**현재 대응책:**
- HTTPS 강제 적용 (프로덕션)
- HSTS 헤더 설정

**추가 보안 강화:**
```typescript
// 개발 환경에서도 HTTPS 강제
export const enforceHTTPS = () => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (env.NODE_ENV === 'production' && !request.raw.socket.encrypted) {
      const httpsUrl = `https://${request.hostname}${request.url}`;
      return reply.redirect(301, httpsUrl);
    }
  };
};

// Certificate Pinning 검토
const certFingerprints = [
  'sha256/expected-cert-fingerprint'
];
```

#### 위협: DDoS 공격
**현재 대응책:**
- Rate Limiting 적용
- Fastify 내장 최적화

**추가 보안 강화:**
```typescript
// 적응형 Rate Limiting
export const adaptiveRateLimit = {
  max: (request: FastifyRequest) => {
    // 인증된 사용자는 더 높은 한도
    return request.user ? 1000 : 100;
  },
  timeWindow: '15 minutes',
  whitelist: ['127.0.0.1'], // 내부 IP 화이트리스트
  keyGenerator: (request: FastifyRequest) => {
    // 사용자별 또는 IP별 제한
    return request.user?.id || request.ip;
  }
};

// Slowloris 공격 방지
export const connectionTimeout = {
  requestTimeout: 30000,  // 30초
  connectionTimeout: 60000, // 1분
  keepAliveTimeout: 5000   // 5초
};
```

## 고급 보안 기능

### 1. 보안 로깅 및 모니터링

```typescript
// src/utils/securityLogger.ts
export class SecurityLogger {
  static logAuthAttempt(email: string, success: boolean, ip: string) {
    logger.info('Authentication attempt', {
      email,
      success,
      ip,
      timestamp: new Date().toISOString(),
      type: 'auth_attempt'
    });
  }

  static logSuspiciousActivity(userId: string, activity: string, details: any) {
    logger.warn('Suspicious activity detected', {
      userId,
      activity,
      details,
      timestamp: new Date().toISOString(),
      type: 'security_alert'
    });
  }

  static logDataAccess(userId: string, resource: string, action: string) {
    logger.info('Data access', {
      userId,
      resource,
      action,
      timestamp: new Date().toISOString(),
      type: 'data_access'
    });
  }
}
```

### 2. 침입 탐지 시스템

```typescript
// src/middleware/intrusionDetection.ts
export class IntrusionDetection {
  private static suspiciousPatterns = [
    /(\b(union|select|insert|delete|update|drop|create|alter)\b)/i,
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi
  ];

  static detectSQLInjection(input: string): boolean {
    return this.suspiciousPatterns.some(pattern => pattern.test(input));
  }

  static async analyzeRequest(request: FastifyRequest): Promise<boolean> {
    const body = JSON.stringify(request.body);
    const query = JSON.stringify(request.query);
    
    if (this.detectSQLInjection(body) || this.detectSQLInjection(query)) {
      SecurityLogger.logSuspiciousActivity(
        request.user?.id || 'anonymous',
        'sql_injection_attempt',
        { body, query, ip: request.ip }
      );
      return true;
    }
    
    return false;
  }
}

export const intrusionDetectionMiddleware = async (
  request: FastifyRequest, 
  reply: FastifyReply
) => {
  const isSuspicious = await IntrusionDetection.analyzeRequest(request);
  
  if (isSuspicious) {
    return reply.status(400).send({ 
      error: '잘못된 요청입니다' 
    });
  }
};
```

### 3. 데이터 무결성 검증

```typescript
// src/utils/dataIntegrity.ts
export class DataIntegrity {
  static generateChecksum(data: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  static verifyChecksum(data: any, expectedChecksum: string): boolean {
    const actualChecksum = this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  // 중요한 데이터 변경 시 체크섬 검증
  static async verifyBookmarkIntegrity(bookmarkId: string): Promise<boolean> {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      include: { websiteMetadata: true, tags: true }
    });

    if (!bookmark) return false;

    // 저장된 체크섬과 현재 데이터 체크섬 비교
    const currentChecksum = this.generateChecksum({
      url: bookmark.websiteMetadata.url,
      title: bookmark.personalTitle,
      note: bookmark.personalNote
    });

    return this.verifyChecksum(bookmark, currentChecksum);
  }
}
```

## 환경별 보안 설정

### 개발 환경 보안

```typescript
// src/config/security.dev.ts
export const developmentSecurity = {
  // 개발 편의를 위한 완화된 설정
  cors: {
    origin: true,
    credentials: true
  },
  
  rateLimit: {
    max: 1000,
    timeWindow: '1 minute'
  },
  
  jwt: {
    expiresIn: '7d', // 개발 시 편의를 위해 길게 설정
    secret: 'dev-secret-key'
  },
  
  // 개발 환경에서는 더 자세한 에러 메시지
  detailedErrors: true
};
```

### 프로덕션 환경 보안

```typescript
// src/config/security.prod.ts
export const productionSecurity = {
  cors: {
    origin: [process.env.ALLOWED_ORIGIN],
    credentials: true
  },
  
  rateLimit: {
    max: 100,
    timeWindow: '15 minutes',
    whitelist: [], // 화이트리스트 없음
    ban: 10 // 10번 제한 초과 시 IP 차단
  },
  
  jwt: {
    expiresIn: '15m',
    secret: process.env.JWT_SECRET, // 환경 변수에서 로드
    refreshExpiresIn: '7d'
  },
  
  // 프로덕션에서는 에러 메시지 최소화
  detailedErrors: false,
  
  // 추가 보안 헤더
  securityHeaders: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'"
  }
};
```

## 보안 체크리스트

### 개발 단계 체크리스트

- [ ] **인증/인가**
  - [ ] JWT 토큰 검증 구현
  - [ ] 권한 기반 접근 제어
  - [ ] 토큰 만료 시간 적절히 설정
  - [ ] Refresh token 패턴 고려

- [ ] **입력 검증**
  - [ ] 모든 입력에 대한 검증 스키마 정의
  - [ ] SQL 인젝션 방지
  - [ ] XSS 공격 방지
  - [ ] 파일 업로드 검증 (해당시)

- [ ] **데이터 보안**
  - [ ] 비밀번호 해싱 (bcrypt)
  - [ ] 민감한 데이터 암호화
  - [ ] 데이터베이스 접근 권한 최소화
  - [ ] 개인정보 마스킹

- [ ] **네트워크 보안**
  - [ ] HTTPS 강제 적용
  - [ ] CORS 정책 설정
  - [ ] Rate limiting 구현
  - [ ] 보안 헤더 설정

### 배포 단계 체크리스트

- [ ] **환경 설정**
  - [ ] 프로덕션 환경 변수 설정
  - [ ] 강력한 비밀키 생성
  - [ ] 불필요한 포트 차단
  - [ ] 방화벽 설정

- [ ] **모니터링**
  - [ ] 보안 로그 수집
  - [ ] 이상 활동 모니터링
  - [ ] 성능 모니터링
  - [ ] 에러 트래킹

- [ ] **백업 및 복구**
  - [ ] 정기적인 데이터 백업
  - [ ] 백업 데이터 암호화
  - [ ] 재해 복구 계획
  - [ ] 백업 복원 테스트

### 운영 단계 체크리스트

- [ ] **지속적인 보안**
  - [ ] 정기적인 보안 패치
  - [ ] 의존성 취약점 스캔
  - [ ] 침투 테스트 수행
  - [ ] 보안 교육 실시

- [ ] **준수 사항**
  - [ ] 개인정보보호법 준수
  - [ ] 데이터 보호 규정 준수
  - [ ] 보안 정책 문서화
  - [ ] 사고 대응 절차 수립

## 보안 사고 대응 절차

### 1. 사고 발견 및 초기 대응

```typescript
// src/utils/incidentResponse.ts
export class IncidentResponse {
  static async detectAndRespond(incident: SecurityIncident) {
    // 1. 즉시 로깅
    SecurityLogger.logSuspiciousActivity(
      incident.userId,
      incident.type,
      incident.details
    );

    // 2. 심각도에 따른 자동 대응
    switch (incident.severity) {
      case 'CRITICAL':
        await this.lockUserAccount(incident.userId);
        await this.notifyAdministrators(incident);
        break;
      
      case 'HIGH':
        await this.flagUserForReview(incident.userId);
        await this.increaseMonitoring(incident.userId);
        break;
      
      case 'MEDIUM':
        await this.logForAnalysis(incident);
        break;
    }
  }

  private static async lockUserAccount(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { 
        isLocked: true,
        lockedAt: new Date(),
        lockReason: 'Security incident detected'
      }
    });
  }
}
```

### 2. 사고 분석 및 복구

```bash
# 보안 사고 분석 스크립트
#!/bin/bash

# 로그 분석
grep "security_alert" /var/log/app.log | tail -100

# 의심스러운 IP 차단
iptables -A INPUT -s SUSPICIOUS_IP -j DROP

# 데이터베이스 무결성 검사
npm run db:integrity-check

# 백업에서 복구 (필요시)
npm run db:restore-from-backup
```

## 정기적인 보안 점검

### 자동화된 보안 스캔

```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on:
  schedule:
    - cron: '0 2 * * *'  # 매일 새벽 2시
  push:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run npm audit
        run: npm audit
        
      - name: Run SAST scan
        uses: github/super-linter@v4
        
      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
```

### 수동 보안 점검 가이드

```bash
# 월간 보안 점검 스크립트
#!/bin/bash

echo "=== 월간 보안 점검 시작 ==="

# 1. 의존성 취약점 검사
npm audit

# 2. 환경 변수 검증
echo "환경 변수 검증..."
node -e "console.log(Object.keys(process.env).filter(k => k.includes('SECRET') || k.includes('PASSWORD')))"

# 3. 로그 분석
echo "보안 로그 분석..."
grep -c "failed_login" /var/log/app.log
grep -c "suspicious_activity" /var/log/app.log

# 4. 데이터베이스 권한 확인
psql -c "\du" bookmark_manager

echo "=== 보안 점검 완료 ==="
```

이 보안 가이드는 지속적으로 업데이트되며, 새로운 위협과 대응 방안을 반영할 예정입니다.