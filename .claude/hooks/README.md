# 🤖 자동화 시스템 마스터 설정

> **역할**: 모든 Hook들을 통합 관리하는 마스터 설정 파일
> **사용법**: Claude가 이 파일을 참조하여 적절한 Hook을 자동 실행

## 📋 Hook 실행 매핑 테이블

| 사용자 입력      | 실행될 Hook             | 설명                    |
| ---------------- | ----------------------- | ----------------------- |
| `단계: 탐색`     | stage-transition.md     | 탐색 단계로 전환        |
| `단계: 계획`     | stage-transition.md     | 계획 단계로 전환        |
| `단계: 구현`     | stage-transition.md     | 구현 단계로 전환        |
| `단계: 커밋`     | stage-transition.md     | 커밋 단계로 전환        |
| `시작: [기능명]` | stage-transition.md     | 새 기능 시작            |
| `완료: [기능명]` | stage-transition.md     | 기능 완료 처리          |
| `커밋해줘`       | pre-commit-checklist.md | 커밋 전 체크리스트 실행 |
| 파일 변경 감지   | context-auto-update.md  | 컨텍스트 자동 업데이트  |
| 커밋 완료 후     | post-commit-cleanup.md  | 커밋 후 정리 작업       |

## 🎯 Hook 실행 우선순위

### 1순위: 안전성 Hook

- `pre-commit-checklist.md` - 품질과 보안 보장

### 2순위: 워크플로우 Hook

- `stage-transition.md` - 체계적인 단계 진행

### 3순위: 자동화 Hook

- `context-auto-update.md` - 편의성 향상
- `post-commit-cleanup.md` - 정리 자동화

## 🔍 Hook 감지 키워드

### 단계 전환 키워드

```
- "단계: 탐색" / "탐색 단계" / "탐색 모드"
- "단계: 계획" / "계획 단계" / "계획 모드"
- "단계: 구현" / "구현 단계" / "구현 모드"
- "단계: 커밋" / "커밋 단계" / "커밋 모드"
```

### 기능 관리 키워드

```
- "시작: [기능명]" / "[기능명] 시작"
- "완료: [기능명]" / "[기능명] 완료"
```

### 커밋 관련 키워드

```
- "커밋해줘" / "커밋하자" / "commit"
- "코드 검사" / "테스트 실행" / "품질 체크"
```

### 상태 관리 키워드

```
- "상태 업데이트" / "현재 상태" / "진행률"
- "컨텍스트 동기화" / "문서 업데이트"
```

## 🤖 Claude를 위한 Hook 실행 가이드

### Hook 실행 조건 체크

```javascript
// 의사코드
function shouldExecuteHook(userInput, currentContext) {
  // 1. 키워드 매칭 확인
  const matchedKeywords = detectKeywords(userInput);

  // 2. 현재 컨텍스트 상태 확인
  const currentStage = getCurrentStage();
  const currentFeature = getCurrentFeature();

  // 3. 적절한 Hook 선택
  return selectAppropriateHook(matchedKeywords, currentStage);
}
```

### Hook 실행 순서

1. **사용자 입력 분석**: 어떤 작업을 원하는지 파악
2. **현재 상태 확인**: context/current-status.md에서 현재 위치 확인
3. **적절한 Hook 선택**: 위 매핑 테이블 참조
4. **Hook 실행**: 해당 Hook 파일의 명령어 실행
5. **결과 반영**: 실행 결과를 컨텍스트에 반영

## 📚 Claude 실행 예시

### 예시 1: 사용자가 "단계: 구현"이라고 입력

```
1. 키워드 감지: "단계: 구현"
2. 매핑 확인: stage-transition.md 실행 필요
3. 현재 상태 확인: current-status.md에서 현재 단계 확인
4. 이전 단계 검증: 계획 단계가 완료되었는지 확인
5. Hook 실행: stage-transition.md의 "단계: 구현" 명령어 실행
6. 결과 업데이트: 모든 관련 컨텍스트 파일 업데이트
```

### 예시 2: 사용자가 JWT 관련 파일을 수정

```
1. 파일 변경 감지: src/auth/jwt.service.ts 수정됨
2. 매핑 확인: context-auto-update.md 실행 필요
3. 관련 기능 파악: JWT → 인증 시스템
4. Hook 실행: context-auto-update.md의 명령어 실행
5. 컨텍스트 업데이트: features/auth-system.md 자동 업데이트
```

## ⚠️ Hook 실행 시 주의사항

### 안전 장치

- Hook 실행 전 현재 상태 백업
- 오류 발생 시 롤백 기능
- 무한 루프 방지 (Hook이 Hook을 트리거하는 상황 방지)

### 사용자 피드백

- Hook 실행 시작 시 알림
- 진행 상황 실시간 업데이트
- 완료 시 결과 요약 제공
