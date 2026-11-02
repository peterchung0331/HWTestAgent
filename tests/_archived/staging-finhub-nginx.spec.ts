/**
 * WBFinHub 스테이징 환경 테스트 (Nginx 포트 4400)
 *
 * 테스트 대상:
 * - Nginx 리버스 프록시를 통한 핀허브 접근
 * - 경로 기반 라우팅 (/finhub)
 * - API 헬스체크
 * - 쿠키 전달
 */

import { test, expect } from '@playwright/test';

const NGINX_URL = 'http://localhost:4400';
const DIRECT_URL = 'http://localhost:4020';

test.describe('WBFinHub 스테이징 환경 테스트', () => {

  test('1. 핀허브 직접 접근 - 헬스체크 (포트 4020)', async ({ request }) => {
    console.log('🔍 핀허브 직접 접근 테스트...');

    const response = await request.get(`${DIRECT_URL}/api/health`);
    console.log(`Status: ${response.status()}`);

    if (response.ok()) {
      const body = await response.json();
      console.log('✅ 핀허브 직접 접근 성공:', body);
      expect(body.success).toBe(true);
      expect(body.port).toBe('4020');
    } else {
      const text = await response.text();
      console.log('❌ 핀허브 직접 접근 실패:', text);
    }
  });

  test('2. Nginx를 통한 핀허브 접근 - /finhub/api/health', async ({ request }) => {
    console.log('🔍 Nginx를 통한 핀허브 API 접근 테스트...');

    // 여러 경로 시도
    const paths = [
      '/finhub/api/health',
      '/finhub/api/health/',
      '/finhub',
    ];

    for (const path of paths) {
      console.log(`\n테스트 경로: ${NGINX_URL}${path}`);
      const response = await request.get(`${NGINX_URL}${path}`);
      console.log(`  - Status: ${response.status()}`);

      if (response.ok()) {
        const contentType = response.headers()['content-type'];
        if (contentType?.includes('application/json')) {
          const body = await response.json();
          console.log('  - ✅ JSON 응답:', body);
        } else {
          const text = await response.text();
          console.log(`  - ✅ 응답 길이: ${text.length} bytes`);
          console.log(`  - Content-Type: ${contentType}`);
        }
      } else {
        const text = await response.text();
        console.log(`  - ❌ 에러: ${text.substring(0, 200)}`);
      }
    }
  });

  test('3. Nginx upstream 설정 확인', async ({ page }) => {
    console.log('🔍 Nginx upstream 확인...');

    // Nginx 내부에서 핀허브로 직접 curl
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('docker exec wbhub-nginx curl -s http://wbfinhub:4020/api/health');
      console.log('Nginx → wbfinhub:4020/api/health:', stdout);
    } catch (error: any) {
      console.log('❌ Nginx upstream 테스트 실패:', error.message);
    }
  });

  test('4. 핀허브 컨테이너 환경변수 확인', async () => {
    console.log('🔍 핀허브 컨테이너 환경변수 확인...');

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('docker exec wbfinhub env | grep -E "(NODE_ENV|PORT|FRONTEND_URL)"');
      console.log('환경변수:\n', stdout);
    } catch (error: any) {
      console.log('❌ 환경변수 확인 실패:', error.message);
    }
  });

  test('5. 핀허브 로그 확인 - basePath 설정', async () => {
    console.log('🔍 핀허브 로그 확인...');

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('docker logs wbfinhub --tail 100 2>&1 | grep -E "(basePath|routes registered|listening|health)"');
      console.log('로그:\n', stdout);
    } catch (error: any) {
      console.log('❌ 로그 확인 실패:', error.message);
    }
  });

  test('6. Nginx rewrite 규칙 확인', async () => {
    console.log('🔍 Nginx rewrite 규칙 확인...');

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('docker exec wbhub-nginx cat /etc/nginx/nginx.conf | grep -A 5 "location /finhub"');
      console.log('Nginx 설정:\n', stdout);
    } catch (error: any) {
      console.log('❌ Nginx 설정 확인 실패:', error.message);
    }
  });

  test('7. 프론트엔드 페이지 접근 테스트', async ({ page }) => {
    console.log('🔍 핀허브 프론트엔드 접근 테스트...');

    // 네트워크 요청 모니터링
    page.on('request', request => {
      if (request.url().includes('finhub') || request.url().includes('4020') || request.url().includes('4400')) {
        console.log(`→ Request: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('finhub') || response.url().includes('4020') || response.url().includes('4400')) {
        console.log(`← Response: ${response.status()} ${response.url()}`);
      }
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Error:', msg.text());
      }
    });

    try {
      console.log(`\n1. Nginx를 통한 접근: ${NGINX_URL}/finhub`);
      const response = await page.goto(`${NGINX_URL}/finhub`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });

      console.log(`   Status: ${response?.status()}`);

      await page.screenshot({
        path: '/home/peterchung/HWTestAgent/test-results/staging-finhub-nginx.png',
        fullPage: true
      });
      console.log('   스크린샷 저장: staging-finhub-nginx.png');

      // 페이지 제목 확인
      const title = await page.title();
      console.log(`   페이지 제목: ${title}`);

    } catch (error: any) {
      console.log('❌ 페이지 로드 실패:', error.message);

      // 에러 페이지도 스크린샷
      await page.screenshot({
        path: '/home/peterchung/HWTestAgent/test-results/staging-finhub-nginx-error.png',
        fullPage: true
      });
    }
  });
});
