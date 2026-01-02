# HWTestAgent Playwright 테스트

HWTestAgent의 E2E 테스트는 Playwright를 사용하여 WorkHub 프로젝트들의 SSO 및 주요 기능을 테스트합니다.

## 설정 완료 사항

### 1. Playwright 설치
```json
// package.json에 이미 설치됨
"devDependencies": {
  "@playwright/test": "^1.57.0"
}
```

### 2. Playwright 설정 파일
- **파일**: `playwright.config.ts`
- **기본 URL**: `http://workhub.biz` (Oracle Cloud Production)
- **브라우저**: Chromium, Firefox, WebKit
- **스크린샷**: 테스트 실패 시 자동 저장
- **비디오**: 테스트 실패 시 녹화
- **결과 저장**: `test-results/` 디렉토리

### 3. 테스트 스크립트 (package.json)
```bash
# 모든 테스트 실행 (headless)
npm test

# UI 모드로 테스트 실행
npm run test:ui

# 브라우저를 표시하며 테스트 실행
npm run test:headed

# SalesHub SSO 테스트만 실행 (headless)
npm run test:saleshub

# SalesHub SSO 테스트만 실행 (headed)
npm run test:saleshub:headed

# 테스트 리포트 보기
npm run test:report

# Playwright 브라우저 설치
npm run playwright:install
```

## 현재 테스트 시나리오

### WBSalesHub SSO 테스트 (`tests/e2e/saleshub-sso.spec.ts`)

**테스트 환경**: Oracle Cloud Production
- HubManager: http://workhub.biz
- SalesHub: http://workhub.biz/saleshub

**SSO 플로우**:
1. HubManager Hub 선택 페이지 접속
2. SalesHub 카드 클릭
3. Google OAuth 리디렉션 확인
4. (수동) Google 로그인 후 SalesHub 대시보드 접속 확인

**테스트 케이스**:
- ✅ `01. HubManager 접속 및 Hub 목록 확인`
- ✅ `02. SalesHub 카드 클릭 및 Google OAuth 리디렉션`
- ✅ `03. SalesHub 직접 접속 (SSO 없이)`
- ✅ `04. Backend API 헬스 체크`
- ✅ `05. SalesHub Backend 헬스 체크`

## 테스트 결과 확인

### 1. 스크린샷
테스트 실행 시 각 단계별로 스크린샷이 저장됩니다:
```
test-results/screenshots/
├── 01-hubmanager-hubs.png          # HubManager 접속
├── 02-saleshub-card-visible.png    # SalesHub 카드 확인
├── 03-before-click.png              # 클릭 전
├── 04-after-click.png               # 클릭 후
├── 05-google-oauth.png              # Google OAuth 페이지
├── 06-auth-redirect.png             # Auth 리디렉션
├── 07-saleshub-dashboard.png        # SalesHub 대시보드
└── 09-saleshub-direct.png           # SalesHub 직접 접속
```

### 2. HTML 리포트
```bash
npm run test:report
```

### 3. JSON 결과
```
test-results/results.json
```

### 4. 비디오 (실패 시)
```
test-results/artifacts/
```

## 새 테스트 추가 방법

### 1. 테스트 파일 생성
```bash
# tests/e2e/ 디렉토리에 새 테스트 파일 생성
touch tests/e2e/finhub-sso.spec.ts
```

### 2. 테스트 작성 템플릿
```typescript
import { test, expect } from '@playwright/test';

test.describe('Test Suite Name', () => {

  test.beforeEach(async ({ page }) => {
    // 네트워크 및 콘솔 모니터링
    page.on('requestfailed', request => {
      console.log('❌ Request failed:', request.url());
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
  });

  test('Test Case 1', async ({ page }) => {
    console.log('🚀 Step 1: Description');

    const response = await page.goto('http://workhub.biz/path', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    expect(response?.status()).toBe(200);

    // 스크린샷 저장
    await page.screenshot({
      path: 'test-results/screenshots/step-name.png',
      fullPage: true
    });

    console.log('✅ Step completed');
  });
});
```

### 3. package.json에 스크립트 추가
```json
{
  "scripts": {
    "test:finhub": "playwright test tests/e2e/finhub-sso.spec.ts",
    "test:finhub:headed": "playwright test tests/e2e/finhub-sso.spec.ts --headed"
  }
}
```

## 트러블슈팅

### Playwright 브라우저 설치 필요
```bash
npm run playwright:install
```

### 특정 브라우저만 사용
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### 디버그 모드
```bash
npx playwright test --debug
```

### 특정 테스트만 실행
```bash
npx playwright test -g "테스트 이름"
```

### Headed 모드 (브라우저 표시)
```bash
npm run test:headed
```

## 주의사항

1. **Production 환경 테스트**: 현재 모든 테스트는 Oracle Cloud Production(`http://workhub.biz`)을 대상으로 실행됩니다.
2. **Google OAuth**: Google 로그인이 필요한 테스트는 수동 로그인이 필요할 수 있습니다.
3. **타임아웃**: 네트워크 속도에 따라 타임아웃을 조정해야 할 수 있습니다.
4. **스크린샷 저장**: 각 테스트 실행 시 스크린샷이 누적되므로 주기적으로 정리가 필요합니다.

## 참고 문서

- [Playwright 공식 문서](https://playwright.dev/)
- [Playwright Test Runner](https://playwright.dev/docs/test-runner)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

---
마지막 업데이트: 2026-01-02
