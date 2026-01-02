import { defineConfig, devices } from '@playwright/test';

/**
 * HWTestAgent Playwright Configuration
 *
 * Production 환경 테스트를 위한 설정
 */
export default defineConfig({
  testDir: './tests',

  // 테스트 타임아웃
  timeout: 60 * 1000, // 60초

  // 각 테스트 실패 시 재시도
  retries: 1,

  // 병렬 실행 워커 수
  workers: 1,

  // 리포터 설정
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],

  // 테스트 결과 저장
  use: {
    // 기본 URL (Production)
    baseURL: 'http://workhub.biz',

    // 스크린샷
    screenshot: 'only-on-failure',

    // 비디오 녹화
    video: 'retain-on-failure',

    // 트레이스
    trace: 'retain-on-failure',

    // 네트워크 대기
    actionTimeout: 15 * 1000,

    // 브라우저 컨텍스트 옵션
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  // 프로젝트별 설정
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // 출력 디렉토리
  outputDir: 'test-results/artifacts',
});
