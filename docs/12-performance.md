# 성능 최적화 가이드

## 개요

이 문서는 북마크 관리 API의 성능 최적화 전략과 구현 방법을 설명합니다.

## 현재 성능 현황

### 기본 성능 지표

**현재 구현된 최적화:**
- ✅ Prisma ORM을 통한 쿼리 최적화
- ✅ 페이지네이션을 통한 대용량 데이터 처리
- ✅ 데이터베이스 인덱스 적용
- ✅ 웹사이트 메타데이터 캐싱
- ✅ Fastify의 고성능 HTTP 처리

**성능 목표:**
- API 응답 시간: 평균 < 200ms
- 동시 접속자: 1,000명 이상
- 데이터베이스 쿼리: < 50ms
- 메모리 사용량: < 512MB

## 데이터베이스 최적화

### 1. 인덱스 전략

#### 현재 적용된 인덱스

```sql
-- 사용자별 북마크 조회 최적화
CREATE INDEX idx_bookmarks_user_deleted ON bookmarks(userId, deletedAt);

-- 카테고리별 북마크 조회
CREATE INDEX idx_bookmarks_category ON bookmarks(categoryId);

-- 생성일자 정렬
CREATE INDEX idx_bookmarks_created ON bookmarks(createdAt);

-- 유니크 제약 조건
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_categories_user_name ON categories(userId, name);
CREATE UNIQUE INDEX idx_tags_user_name ON tags(userId, name);
CREATE UNIQUE INDEX idx_metadata_url ON website_metadata(url);
```

#### 추가 인덱스 최적화

```sql
-- 복합 검색을 위한 인덱스
CREATE INDEX idx_bookmarks_search ON bookmarks 
USING gin(to_tsvector('korean', coalesce(personalTitle, '') || ' ' || coalesce(personalNote, '')));

-- 태그 검색 최적화
CREATE INDEX idx_bookmark_tags_lookup ON bookmark_tags(tagId, bookmarkId);

-- 카테고리별 북마크 카운트 최적화
CREATE INDEX idx_bookmarks_category_count ON bookmarks(categoryId, deletedAt) 
WHERE deletedAt IS NULL;

-- 최근 북마크 조회 최적화 (부분 인덱스)
CREATE INDEX idx_bookmarks_recent ON bookmarks(userId, createdAt DESC) 
WHERE deletedAt IS NULL;
```

### 2. 쿼리 최적화

#### N+1 문제 해결

```typescript
// ❌ N+1 문제가 있는 쿼리
const categories = await prisma.category.findMany({
  where: { userId }
});

for (const category of categories) {
  const bookmarkCount = await prisma.bookmark.count({
    where: { categoryId: category.id, deletedAt: null }
  });
  category.bookmarkCount = bookmarkCount;
}

// ✅ 최적화된 쿼리 (한 번의 쿼리로 해결)
const categories = await prisma.category.findMany({
  where: { userId },
  include: {
    _count: {
      select: {
        bookmarks: {
          where: { deletedAt: null }
        }
      }
    }
  }
});
```

#### 배치 처리 최적화

```typescript
// src/services/BookmarkService.ts
export class BookmarkService {
  // 대량 북마크 생성 최적화
  async createBulkBookmarks(userId: string, bookmarks: CreateBookmarkData[]): Promise<Bookmark[]> {
    return await prisma.$transaction(async (tx) => {
      // 1. 메타데이터를 배치로 처리
      const urls = bookmarks.map(b => b.url);
      const existingMetadata = await tx.websiteMetadata.findMany({
        where: { url: { in: urls } }
      });
      
      const existingUrls = new Set(existingMetadata.map(m => m.url));
      const newUrls = urls.filter(url => !existingUrls.has(url));
      
      // 2. 새로운 메타데이터 배치 생성
      if (newUrls.length > 0) {
        const newMetadata = await Promise.all(
          newUrls.map(url => this.fetchMetadata(url))
        );
        
        await tx.websiteMetadata.createMany({
          data: newMetadata
        });
      }
      
      // 3. 북마크 배치 생성
      const metadataMap = new Map(
        [...existingMetadata, ...newMetadata].map(m => [m.url, m.id])
      );
      
      return await tx.bookmark.createMany({
        data: bookmarks.map(bookmark => ({
          ...bookmark,
          userId,
          websiteMetadataId: metadataMap.get(bookmark.url)!
        }))
      });
    });
  }

  // 효율적인 검색 쿼리
  async searchBookmarks(
    userId: string, 
    query: string, 
    pagination: PaginationOptions
  ): Promise<SearchResult> {
    const searchCondition = {
      userId,
      deletedAt: null,
      OR: [
        { personalTitle: { contains: query, mode: 'insensitive' as const } },
        { personalNote: { contains: query, mode: 'insensitive' as const } },
        { websiteMetadata: { 
          OR: [
            { title: { contains: query, mode: 'insensitive' as const } },
            { description: { contains: query, mode: 'insensitive' as const } },
            { url: { contains: query, mode: 'insensitive' as const } }
          ]
        }},
        { tags: { 
          some: { 
            tag: { name: { contains: query, mode: 'insensitive' as const } }
          }
        }}
      ]
    };

    // 병렬로 데이터와 카운트 조회
    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where: searchCondition,
        include: {
          websiteMetadata: true,
          category: true,
          tags: { include: { tag: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit
      }),
      prisma.bookmark.count({ where: searchCondition })
    ]);

    return { bookmarks, total };
  }
}
```

### 3. 연결 풀 최적화

```typescript
// src/config/database.ts
const createPrismaClient = () => {
  const connectionLimit = process.env.NODE_ENV === 'production' ? 20 : 5;
  
  return new PrismaClient({
    datasources: {
      db: {
        url: `${databaseUrl}?connection_limit=${connectionLimit}&pool_timeout=20&socket_timeout=60`
      }
    },
    log: isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
};

// 연결 풀 모니터링
export const getConnectionPoolStats = async () => {
  const stats = await prisma.$queryRaw`
    SELECT 
      count(*) as total_connections,
      count(*) FILTER (WHERE state = 'active') as active_connections,
      count(*) FILTER (WHERE state = 'idle') as idle_connections
    FROM pg_stat_activity 
    WHERE datname = current_database();
  `;
  
  return stats;
};
```

## 애플리케이션 레벨 최적화

### 1. 캐싱 전략

#### 메모리 캐싱 (Node.js Cache)

```typescript
// src/utils/cache.ts
export class MemoryCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5분

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  // 메모리 사용량 모니터링
  getStats() {
    return {
      size: this.cache.size,
      memoryUsage: process.memoryUsage()
    };
  }
}

// 전역 캐시 인스턴스
export const appCache = new MemoryCache();
```

#### 웹사이트 메타데이터 캐싱

```typescript
// src/services/MetadataService.ts
export class MetadataService {
  async getOrFetchMetadata(url: string): Promise<WebsiteMetadata> {
    // 1. 캐시에서 확인
    const cached = appCache.get<WebsiteMetadata>(`metadata:${url}`);
    if (cached) return cached;

    // 2. 데이터베이스에서 확인
    let metadata = await prisma.websiteMetadata.findUnique({
      where: { url }
    });

    if (!metadata) {
      // 3. 외부 API에서 가져오기
      metadata = await this.fetchFromExternal(url);
      
      // 4. 데이터베이스에 저장
      metadata = await prisma.websiteMetadata.create({
        data: metadata
      });
    }

    // 5. 캐시에 저장 (1시간)
    appCache.set(`metadata:${url}`, metadata, 60 * 60 * 1000);

    return metadata;
  }

  private async fetchFromExternal(url: string): Promise<WebsiteMetadata> {
    // 외부 메타데이터 가져오기 로직
    const timeout = parseInt(env.METADATA_FETCH_TIMEOUT);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Bookmark-Manager-Bot/1.0'
        }
      });

      const html = await response.text();
      return this.parseMetadata(html, url);
    } catch (error) {
      // 기본 메타데이터 반환
      return {
        url,
        title: new URL(url).hostname,
        description: null,
        favicon: null,
        image: null
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
```

#### Redis 캐싱 도입 (고급)

```typescript
// src/config/redis.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: env.REDIS_HOST || 'localhost',
  port: env.REDIS_PORT || 6379,
  password: env.REDIS_PASSWORD,
  db: 0,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
  keepAlive: 30000
});

// Redis 캐시 래퍼
export class RedisCache {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis get error', { key, error });
      return null;
    }
  }

  static async set(key: string, data: any, ttl: number = 300): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      logger.error('Redis set error', { key, error });
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Redis del error', { key, error });
    }
  }

  // 패턴 기반 캐시 무효화
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Redis invalidate pattern error', { pattern, error });
    }
  }
}
```

### 2. 비동기 처리 최적화

#### Promise 병렬 처리

```typescript
// src/services/BookmarkService.ts
export class BookmarkService {
  async getBookmarkWithStats(bookmarkId: string, userId: string) {
    // 병렬로 여러 데이터 조회
    const [bookmark, relatedBookmarks, categoryStats, tagStats] = await Promise.all([
      // 북마크 상세 정보
      prisma.bookmark.findFirst({
        where: { id: bookmarkId, userId, deletedAt: null },
        include: {
          websiteMetadata: true,
          category: true,
          tags: { include: { tag: true } }
        }
      }),
      
      // 관련 북마크 (같은 카테고리)
      prisma.bookmark.findMany({
        where: {
          userId,
          categoryId: { not: null },
          id: { not: bookmarkId },
          deletedAt: null
        },
        take: 5,
        orderBy: { createdAt: 'desc' }
      }),
      
      // 카테고리 통계
      prisma.bookmark.groupBy({
        by: ['categoryId'],
        where: { userId, deletedAt: null },
        _count: true
      }),
      
      // 태그 통계
      prisma.bookmarkTag.groupBy({
        by: ['tagId'],
        where: { bookmark: { userId, deletedAt: null } },
        _count: true,
        orderBy: { _count: { tagId: 'desc' } },
        take: 10
      })
    ]);

    return {
      bookmark,
      relatedBookmarks,
      stats: {
        categoryStats,
        tagStats
      }
    };
  }
}
```

#### 백그라운드 작업 처리

```typescript
// src/utils/backgroundJobs.ts
export class BackgroundJobManager {
  private jobQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  async addJob(job: () => Promise<void>): Promise<void> {
    this.jobQueue.push(job);
    
    if (!this.isProcessing) {
      this.processJobs();
    }
  }

  private async processJobs(): Promise<void> {
    this.isProcessing = true;

    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift();
      if (job) {
        try {
          await job();
        } catch (error) {
          logger.error('Background job failed', { error });
        }
      }
    }

    this.isProcessing = false;
  }
}

// 사용 예시: 메타데이터 업데이트를 백그라운드에서 처리
export const updateMetadataBackground = async (url: string) => {
  backgroundJobManager.addJob(async () => {
    const freshMetadata = await metadataService.fetchFromExternal(url);
    await prisma.websiteMetadata.update({
      where: { url },
      data: freshMetadata
    });
  });
};
```

## HTTP 응답 최적화

### 1. 응답 압축

```typescript
// src/app.ts
import compress from '@fastify/compress';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: createLogger(),
    trustProxy: true
  });

  // 응답 압축 (gzip, deflate, br)
  await app.register(compress, {
    global: true,
    threshold: 1024, // 1KB 이상만 압축
    encodings: ['gzip', 'deflate']
  });

  return app;
}
```

### 2. HTTP 캐싱 헤더

```typescript
// src/middleware/caching.ts
export const setCacheHeaders = (maxAge: number) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // 정적 데이터에 대한 캐싱 헤더
    reply.header('Cache-Control', `public, max-age=${maxAge}`);
    reply.header('ETag', generateETag(request.url));
    
    // If-None-Match 헤더 확인
    const ifNoneMatch = request.headers['if-none-match'];
    const etag = reply.getHeader('ETag');
    
    if (ifNoneMatch === etag) {
      return reply.status(304).send();
    }
  };
};

// 카테고리 목록에 캐싱 적용 (5분)
app.get('/categories', {
  preHandler: setCacheHeaders(300)
}, categoryController.getCategories);
```

### 3. 응답 최적화

```typescript
// src/utils/response.ts
export const optimizedSuccess = <T>(data: T, options?: ResponseOptions) => {
  const response: any = { success: true };
  
  // 데이터가 배열이고 비어있으면 빈 배열만 반환
  if (Array.isArray(data) && data.length === 0) {
    response.data = [];
    return response;
  }

  // 불필요한 필드 제거
  if (typeof data === 'object' && data !== null) {
    response.data = removeNullFields(data);
  } else {
    response.data = data;
  }

  // 개발 환경에서만 추가 정보 포함
  if (process.env.NODE_ENV === 'development' && options?.debug) {
    response.timestamp = new Date().toISOString();
    response.responseTime = options.responseTime;
  }

  return response;
};

const removeNullFields = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeNullFields);
  }
  
  if (obj && typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        cleaned[key] = removeNullFields(value);
      }
    }
    return cleaned;
  }
  
  return obj;
};
```

## 모니터링 및 성능 측정

### 1. 성능 메트릭 수집

```typescript
// src/middleware/performance.ts
export const performanceMonitoring = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const startTime = Date.now();
  
  reply.addHook('onSend', async (request, reply, payload) => {
    const responseTime = Date.now() - startTime;
    
    // 성능 로그
    logger.info('Request completed', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime,
      userAgent: request.headers['user-agent'],
      ip: request.ip
    });

    // 응답 시간 헤더 추가
    reply.header('X-Response-Time', `${responseTime}ms`);

    // 느린 쿼리 감지 (500ms 이상)
    if (responseTime > 500) {
      logger.warn('Slow request detected', {
        url: request.url,
        responseTime,
        userId: request.user?.id
      });
    }

    return payload;
  });
};
```

### 2. 애플리케이션 메트릭

```typescript
// src/utils/metrics.ts
export class ApplicationMetrics {
  private static metrics = {
    requests: 0,
    errors: 0,
    responseTimes: [] as number[],
    activeConnections: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  static incrementRequests(): void {
    this.metrics.requests++;
  }

  static incrementErrors(): void {
    this.metrics.errors++;
  }

  static addResponseTime(time: number): void {
    this.metrics.responseTimes.push(time);
    
    // 최근 1000개만 유지
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-1000);
    }
  }

  static incrementCacheHit(): void {
    this.metrics.cacheHits++;
  }

  static incrementCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  static getMetrics() {
    const responseTimes = this.metrics.responseTimes;
    
    return {
      ...this.metrics,
      averageResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b) / responseTimes.length 
        : 0,
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      cacheHitRate: this.metrics.cacheHits / 
        (this.metrics.cacheHits + this.metrics.cacheMisses) * 100,
      errorRate: this.metrics.errors / this.metrics.requests * 100
    };
  }

  private static calculatePercentile(arr: number[], percentile: number): number {
    if (arr.length === 0) return 0;
    
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
    return sorted[index];
  }
}

// 메트릭 엔드포인트
app.get('/metrics', async (request, reply) => {
  const metrics = ApplicationMetrics.getMetrics();
  const systemMetrics = {
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    uptime: process.uptime()
  };

  return {
    application: metrics,
    system: systemMetrics,
    database: await getConnectionPoolStats()
  };
});
```

### 3. 데이터베이스 성능 모니터링

```typescript
// src/utils/dbMonitoring.ts
export class DatabaseMonitoring {
  static async getSlowQueries(): Promise<any[]> {
    return await prisma.$queryRaw`
      SELECT 
        query,
        mean_exec_time,
        calls,
        total_exec_time,
        rows,
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
      FROM pg_stat_statements 
      ORDER BY mean_exec_time DESC 
      LIMIT 10;
    `;
  }

  static async getTableStats(): Promise<any[]> {
    return await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public'
      ORDER BY tablename, attname;
    `;
  }

  static async getIndexUsage(): Promise<any[]> {
    return await prisma.$queryRaw`
      SELECT 
        t.tablename,
        indexname,
        c.reltuples AS num_rows,
        pg_size_pretty(pg_relation_size(quote_ident(t.tablename)::text)) AS table_size,
        pg_size_pretty(pg_relation_size(quote_ident(indexrelname)::text)) AS index_size,
        CASE WHEN indisunique THEN 'Y' ELSE 'N' END AS UNIQUE,
        idx_scan as number_of_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_tables t
      LEFT OUTER JOIN pg_class c ON c.relname=t.tablename
      LEFT OUTER JOIN 
        (SELECT c.relname AS ctablename, ipg.relname AS indexname, x.indnatts AS number_of_columns, idx_scan, idx_tup_read, idx_tup_fetch, indexrelname, indisunique FROM pg_index x
        JOIN pg_class c ON c.oid = x.indrelid
        JOIN pg_class ipg ON ipg.oid = x.indexrelid  
        JOIN pg_stat_user_indexes psui ON x.indexrelid = psui.indexrelid)
        AS foo
        ON t.tablename = foo.ctablename
      WHERE t.schemaname='public'
      ORDER BY 1,2;
    `;
  }
}
```

## 성능 테스트

### 1. 부하 테스트 스크립트

```bash
#!/bin/bash
# scripts/load-test.sh

echo "Starting load test..."

# 1. 기본 API 응답 시간 테스트
echo "Testing authentication endpoint..."
ab -n 1000 -c 10 -H "Content-Type: application/json" \
  -p auth-payload.json \
  http://localhost:3000/auth/login

# 2. 북마크 목록 조회 테스트
echo "Testing bookmarks list endpoint..."
ab -n 1000 -c 50 -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/bookmarks

# 3. 검색 기능 테스트
echo "Testing search endpoint..."
ab -n 500 -c 25 -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:3000/bookmarks?search=test"

echo "Load test completed!"
```

### 2. 성능 벤치마크

```typescript
// scripts/benchmark.ts
import { performance } from 'perf_hooks';

export class PerformanceBenchmark {
  static async benchmarkDatabaseQueries() {
    const iterations = 1000;
    const results = {
      userLookup: 0,
      bookmarkList: 0,
      searchQuery: 0,
      complexJoin: 0
    };

    // 사용자 조회 벤치마크
    let start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await prisma.user.findUnique({ where: { id: 'test-user-id' } });
    }
    results.userLookup = (performance.now() - start) / iterations;

    // 북마크 목록 조회 벤치마크
    start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await prisma.bookmark.findMany({
        where: { userId: 'test-user-id', deletedAt: null },
        take: 20,
        orderBy: { createdAt: 'desc' }
      });
    }
    results.bookmarkList = (performance.now() - start) / iterations;

    return results;
  }

  static async benchmarkAPI() {
    const baseUrl = 'http://localhost:3000';
    const token = 'test-jwt-token';
    
    const endpoints = [
      { name: 'GET /bookmarks', url: `${baseUrl}/bookmarks` },
      { name: 'GET /categories', url: `${baseUrl}/categories` },
      { name: 'GET /tags', url: `${baseUrl}/tags` }
    ];

    const results = [];

    for (const endpoint of endpoints) {
      const times = [];
      
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        
        await fetch(endpoint.url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        times.push(performance.now() - start);
      }

      results.push({
        endpoint: endpoint.name,
        average: times.reduce((a, b) => a + b) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        p95: times.sort()[Math.floor(times.length * 0.95)]
      });
    }

    return results;
  }
}

// 벤치마크 실행
if (require.main === module) {
  PerformanceBenchmark.benchmarkDatabaseQueries()
    .then(results => console.log('Database benchmark:', results));
  
  PerformanceBenchmark.benchmarkAPI()
    .then(results => console.log('API benchmark:', results));
}
```

## 성능 최적화 체크리스트

### 데이터베이스 최적화

- [ ] **인덱스 최적화**
  - [ ] 자주 사용되는 쿼리 패턴 분석
  - [ ] 복합 인덱스 생성
  - [ ] 불필요한 인덱스 제거
  - [ ] 부분 인덱스 활용

- [ ] **쿼리 최적화**
  - [ ] N+1 문제 해결
  - [ ] 불필요한 조인 제거
  - [ ] 서브쿼리 최적화
  - [ ] 배치 처리 도입

- [ ] **연결 관리**
  - [ ] 연결 풀 크기 최적화
  - [ ] 연결 타임아웃 설정
  - [ ] 장기 트랜잭션 방지

### 애플리케이션 최적화

- [ ] **캐싱 전략**
  - [ ] 메모리 캐싱 구현
  - [ ] Redis 캐싱 도입
  - [ ] CDN 활용
  - [ ] 브라우저 캐싱 설정

- [ ] **비동기 처리**
  - [ ] Promise 병렬 처리
  - [ ] 백그라운드 작업 분리
  - [ ] 이벤트 기반 아키텍처

- [ ] **메모리 관리**
  - [ ] 메모리 누수 방지
  - [ ] 가비지 컬렉션 최적화
  - [ ] 대용량 데이터 스트리밍

### HTTP 최적화

- [ ] **응답 최적화**
  - [ ] 응답 압축 활성화
  - [ ] 불필요한 데이터 제거
  - [ ] 적절한 HTTP 캐싱
  - [ ] ETag 활용

- [ ] **요청 처리**
  - [ ] Keep-Alive 설정
  - [ ] 요청 크기 제한
  - [ ] 타임아웃 설정

### 모니터링

- [ ] **성능 지표**
  - [ ] 응답 시간 모니터링
  - [ ] 처리량 측정
  - [ ] 에러율 추적
  - [ ] 리소스 사용률 모니터링

- [ ] **알림 설정**
  - [ ] 임계값 기반 알림
  - [ ] 성능 저하 감지
  - [ ] 자동 복구 메커니즘

이 성능 최적화 가이드는 시스템 성장에 따라 지속적으로 업데이트될 예정입니다.