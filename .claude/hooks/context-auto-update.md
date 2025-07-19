# 🤖 컨텍스트 자동 업데이트 Hook

> **언제 실행되나**: 파일이 변경될 때마다 자동 실행
> **왜 필요한가**: 코드 변경 시 관련 컨텍스트를 자동으로 최신화

## 🎯 Hook 작동 방식

### 트리거 조건

```
IF 파일이 변경됨 AND (
    파일이 src/ 폴더에 있음 OR
    package.json이 변경됨 OR
    테스트 파일이 변경됨
)
THEN 이 Hook 실행
```

### 실행되는 작업

1. **변경된 파일 분석**: 어떤 기능과 관련된 파일인지 파악
2. **현재 단계 확인**: context/current-status.md에서 현재 진행 단계 확인
3. **해당 컨텍스트 업데이트**: 관련 기능의 컨텍스트 파일 자동 업데이트
4. **진행률 갱신**: current-status.md의 진행률 자동 업데이트

## 📋 실행 명령어

```
변경된 파일을 분석하여 관련 컨텍스트를 자동으로 업데이트해줘.

변경된 파일: [CHANGED_FILES]
현재 작업 중인 기능: [CURRENT_FEATURE]
현재 단계: [CURRENT_STAGE]

다음 작업을 수행해줘:
1. 변경된 파일이 어떤 기능과 관련되어 있는지 파악
2. 해당 기능의 컨텍스트 파일 업데이트
3. current-status.md의 진행률 업데이트
4. 다음 할 일 목록 갱신
```

## 🔍 파일 매핑 규칙

### 인증 관련 파일

- `src/auth/*` → `features/auth-system.md` 업데이트
- `src/middleware/jwt*` → `features/auth-system.md` 업데이트

### 북마크 관련 파일

- `src/bookmark/*` → `features/bookmark-crud.md` 업데이트
- `src/controllers/bookmark*` → `features/bookmark-crud.md` 업데이트

### 데이터베이스 관련 파일

- `prisma/*` → 모든 관련 기능 컨텍스트 업데이트
- `src/database/*` → 현재 작업 중인 기능 컨텍스트 업데이트
