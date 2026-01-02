# HWTestAgent 빠른 테스트 가이드

## 설정 완료 ✅

HWTestAgent에 Playwright E2E 테스트가 완전히 구성되었습니다.

### 설치된 항목
- ✅ Playwright (`@playwright/test`)
- ✅ Playwright Config (`playwright.config.ts`)
- ✅ 테스트 스크립트 (package.json)
- ✅ WBSalesHub SSO 테스트 시나리오
- ✅ 테스트 문서 (`tests/README.md`)

## 빠른 시작

### 1. Playwright 브라우저 설치 (최초 1회만)
```bash
npm run playwright:install
```

### 2. 테스트 실행

#### SalesHub SSO 테스트 (Headless)
```bash
npm run test:saleshub
```

#### SalesHub SSO 테스트 (브라우저 표시)
```bash
npm run test:saleshub:headed
```

#### 모든 테스트 실행
```bash
npm test
```

### 3. 테스트 결과 확인

#### HTML 리포트 보기
```bash
npm run test:report
```

#### 스크린샷 확인
```bash
ls test-results/screenshots/
```

## 사용 가능한 명령어

| 명령어 | 설명 |
|--------|------|
| `npm test` | 모든 테스트 실행 (headless) |
| `npm run test:ui` | UI 모드로 테스트 실행 |
| `npm run test:headed` | 브라우저를 표시하며 테스트 |
| `npm run test:saleshub` | SalesHub SSO 테스트만 실행 |
| `npm run test:saleshub:headed` | SalesHub 테스트 (브라우저 표시) |
| `npm run test:report` | HTML 테스트 리포트 보기 |
| `npm run playwright:install` | Playwright 브라우저 설치 |

## 현재 테스트 시나리오

### WBSalesHub SSO 테스트
- ✅ HubManager 접속
- ✅ Hub 목록 확인
- ✅ SalesHub 카드 클릭
- ✅ Google OAuth 리디렉션 확인
- ✅ Backend API 헬스 체크

**테스트 환경**: Oracle Cloud Production (`http://workhub.biz`)

## 상세 문서

더 자세한 내용은 [tests/README.md](tests/README.md)를 참조하세요.

---
마지막 업데이트: 2026-01-02
