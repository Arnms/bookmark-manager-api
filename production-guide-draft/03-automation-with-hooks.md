# 3. Claude Code Hook 자동화

## 🎣 Hook 시스템 이해

### Hook이란 무엇인가?

**Hook**는 특정 이벤트가 발생할 때 자동으로 실행되는 스크립트나 함수입니다.

#### 일상 생활에서의 Hook 개념

```
문 앞 벨(이벤트) → 자동으로 현관등 켜짐(Hook 실행)
알람 울림(이벤트) → 커피머신 자동 작동(Hook 실행)
```

#### 개발에서의 Hook 개념

```
파일 저장(이벤트) → 자동 포맷팅 실행(Hook)
Git 커밋(이벤트) → 테스트 자동 실행(Hook)
코드 변경(이벤트) → 문서 자동 업데이트(Hook)
```

### Claude Code Hook의 특징

#### **1. 자연어 기반 트리거**

```
일반적인 Hook: 시스템 이벤트 감지
Claude Code Hook: 사용자의 자연어 입력 분석

예시:
- "커밋해줘" → pre-commit Hook 실행
- "단계: 구현" → stage-transition Hook 실행
- 파일 수정 감지 → context-update Hook 실행
```

#### **2. 상황 인식 능력**

```
단순한 키워드 매칭이 아닌 컨텍스트 이해:
- 현재 어떤 기능을 개발 중인지 파악
- 어느 단계에 있는지 인식
- 이전 대화 내용 고려
```

#### **3. 유연한 실행**

```
Rule-based가 아닌 AI 기반 판단:
- 상황에 맞는 적절한 Hook 선택
- 예외 상황 자동 처리
- 사용자 의도 추론
```

## 🏗️ 자동화 설계 철학

### Smart Defaults + Manual Override

#### **Smart Defaults (90% 자동)**

```
대부분의 일반적인 상황에서 AI가 적절한 판단:

사용자: "JWT 인증 시스템을 구현해줘"
Claude: 자동으로 다음 판단
- 새로운 기능 시작
- features/auth-system.md 생성
- 탐색 단계부터 시작
- 관련 체크리스트 제공
```

#### **Manual Override (10% 수동)**

```
특수한 상황이나 사용자가 다른 방식을 원할 때:

사용자: "자동화 끄고 수동으로 계획 단계부터 시작해줘"
Claude: 사용자의 명시적 요청 존중
- 자동화 비활성화
- 수동 모드로 전환
- 계획 단계 직접 시작
```

### 최소 개입 원칙

#### **사용자 부담 최소화**

```
❌ 복잡한 설정과 명령어
"hook execute context-update --feature auth --stage implementation --priority high"

✅ 자연스러운 대화
"JWT 구현 중인데 진행상황 업데이트해줘"
```

#### **기존 워크플로우 존중**

```
❌ 기존 방식 완전 변경
"이제부터는 반드시 이 형식으로만 작업하세요"

✅ 점진적 개선
"기존 방식에 자동화를 추가로 제공합니다"
```

## 🔧 Hook 시스템 구현

### 1. Context Auto-Update Hook

#### **목적과 트리거**

```
목적: 파일 변경 시 관련 컨텍스트 자동 업데이트
트리거: src/ 폴더의 파일 변경 감지

작동 예시:
1. 사용자가 src/auth/jwt.service.ts 파일 수정
2. Hook이 자동으로 감지
3. "auth" 관련 기능으로 판단
4. features/auth-system.md 자동 업데이트
5. current-status.md 진행률 갱신
```

#### **파일 매핑 전략**

```javascript
// 파일 경로 → 기능 매핑 룰
const fileToFeatureMapping = {
  "src/auth/*": "auth-system",
  "src/bookmark/*": "bookmark-crud",
  "src/middleware/jwt*": "auth-system",
  "prisma/*": "current-feature", // 현재 작업 중인 기능
  "tests/*": "infer-from-filename", // 파일명에서 추론
};
```

#### **실제 Hook 코드 구조**

```markdown
# context-auto-update.md

변경된 파일을 분석하여 관련 컨텍스트를 업데이트해줘.

변경된 파일: [CHANGED_FILES]
현재 작업 중인 기능: [CURRENT_FEATURE]

다음 작업 수행:

1. 파일 분석으로 관련 기능 파악
2. 해당 기능 컨텍스트 업데이트
3. 진행률 갱신
4. 다음 할 일 목록 업데이트
```

### 2. Stage Transition Hook

#### **4단계 워크플로우 자동화**

```
사용자 입력: "단계: 구현"

Hook 실행 과정:
1. 현재 상태 확인 (current-status.md 읽기)
2. 이전 단계 완료 여부 검증
3. 새 단계 환경 준비
4. 해당 단계 체크리스트 제공
5. 상태 파일들 업데이트
```

#### **단계별 특화 로직**

```markdown
## 탐색 단계 전환

- 기존 코드 분석 가이드 제공
- 관련 라이브러리 조사 체크리스트
- 탐색 결과 기록 템플릿 준비

## 계획 단계 전환

- 탐색 결과 검토
- 설계 템플릿 제공
- 구현 계획 수립 가이드

## 구현 단계 전환

- 계획 검증
- 코딩 체크리스트 제공
- 진행률 추적 시작

## 커밋 단계 전환

- 구현 완료 검증
- 품질 체크리스트 실행
- 커밋 준비 가이드
```

### 3. Pre-Commit Checklist Hook

#### **품질 보장 자동화**

```
트리거: "커밋해줘", "commit", "코드 검사" 등

자동 실행 체크리스트:
□ TypeScript 컴파일 에러 확인
□ ESLint 규칙 위반 확인
□ 테스트 통과 여부 확인
□ 하드코딩된 비밀번호/API 키 검사
□ .env 파일 커밋 방지
□ 커밋 메시지 품질 검토
```

#### **단계별 검증 로직**

```markdown
# pre-commit-checklist.md

1. **기술적 품질 검사**

   - npm run type-check 실행
   - npm run lint 실행
   - npm test 실행

2. **보안 검사**

   - "password", "api_key", "secret" 하드코딩 스캔
   - .env 파일 변경사항 확인
   - 민감한 로그 출력 검사

3. **문서 동기화**
   - API 변경사항의 문서 반영 확인
   - README 업데이트 필요성 확인

모든 검사 통과 시에만 커밋 진행
```

### 4. Post-Commit Cleanup Hook

#### **완료 후 정리 자동화**

```
트리거: Git 커밋 성공 감지

자동 실행 작업:
1. 완료된 기능을 history/ 폴더로 이동
2. 워크플로우 파일들 초기화
3. current-status.md 진행률 업데이트
4. 다음 우선순위 기능 제안
5. 성과 통계 생성
```

#### **히스토리 아카이브 로직**

```markdown
# post-commit-cleanup.md

커밋 완료 후 정리 작업:

1. **아카이브 생성**
   features/[기능명].md → history/YYYY-MM-DD-[기능명].md
   커밋 해시와 통계 정보 추가

2. **상태 초기화**
   workflow/ 파일들 템플릿으로 리셋
   current-status.md 완료 상태 반영

3. **다음 작업 준비**
   백로그에서 다음 우선순위 기능 확인
   새 기능 컨텍스트 준비

4. **성과 정리**
   완료 통계 생성 및 축하 메시지
```

## 🔗 Hook 간 연동 메커니즘

### Hook 체이닝

#### **자동 연쇄 실행**

```
시나리오: 새 기능 시작

"시작: JWT 인증 시스템"
    ↓
stage-transition Hook 실행 (새 기능 생성)
    ↓
자동으로 "단계: 탐색" 트리거
    ↓
탐색 단계 설정 및 체크리스트 제공
    ↓
파일 수정 시 context-auto-update Hook 자동 실행
```

#### **상호 보완적 동작**

```
구현 중 파일 수정:
1. context-auto-update Hook: 진행사항 자동 기록
2. 사용자가 "단계: 커밋" 입력
3. stage-transition Hook: 커밋 단계 준비
4. pre-commit Hook: 자동 품질 검사
5. 커밋 완료 시 post-commit Hook: 정리 작업
```

### 상태 동기화

#### **중앙 집중식 상태 관리**

```
모든 Hook이 참조하는 중앙 상태:
- current-status.md: 전체 프로젝트 상태
- features/[기능명].md: 기능별 상세 상태

Hook 실행 시 상태 업데이트:
1. 상태 읽기
2. 변경 사항 적용
3. 상태 저장
4. 다른 Hook에 변경사항 전파
```

## 🛡️ 안전장치와 에러 처리

### 무한 루프 방지

#### **실행 컨텍스트 추적**

```javascript
// 의사코드
const executionContext = {
  hookStack: [],
  maxDepth: 3,
  currentDepth: 0,
};

function executeHook(hookName) {
  if (executionContext.currentDepth >= executionContext.maxDepth) {
    console.warn("Hook 실행 depth 초과, 자동 실행 중단");
    return;
  }

  executionContext.hookStack.push(hookName);
  executionContext.currentDepth++;

  // Hook 실행

  executionContext.currentDepth--;
  executionContext.hookStack.pop();
}
```

### 실행 실패 처리

#### **Graceful Degradation**

```
Hook 실행 실패 시:
1. 오류 로그 기록
2. 사용자에게 실패 알림
3. 수동 모드로 전환 제안
4. 상태 롤백 (필요시)

예시:
"자동 업데이트에 실패했습니다.
수동으로 context/current-status.md를 확인해주세요."
```

### 사용자 제어권 보장

#### **중요한 변경 전 확인**

```
자동 실행 vs 확인 요청 기준:

자동 실행 OK:
- 진행률 업데이트
- 체크리스트 제공
- 상태 기록

확인 요청 필요:
- 파일 삭제
- 중요한 설정 변경
- 외부 서비스 호출
```

## 📊 자동화 효과 측정 예시

### 정량적 지표

#### **시간 절약 측정**

```
기존 방식 vs 자동화 후:

작업별 시간 비교:
- 상태 업데이트: 5분 → 30초 (90% 절약)
- 체크리스트 확인: 10분 → 2분 (80% 절약)
- 문서 동기화: 15분 → 1분 (93% 절약)

일일 총 절약: 약 27분
월간 총 절약: 약 13.5시간
```

#### **품질 향상 측정**

```
실수 방지 효과:
- 커밋 전 체크 누락: 30% → 5% (83% 개선)
- 문서화 일관성: 60% → 95% (58% 개선)
- 진행상황 추적: 70% → 98% (40% 개선)
```

### 정성적 효과

#### **개발자 경험 개선**

```
사용자 피드백:
- "관리가 귀찮지 않다"
- "개발에만 집중할 수 있다"
- "놓치는 것이 없다는 안정감"
- "일관된 품질이 자동으로 보장된다"
```

---

**다음 문서**: [4. 실제 구현 가이드](04-implementation-guide.md)
