import { test, expect } from '@playwright/test';

test('FinHub 스테이징 디버깅', async ({ page }) => {
  // 네트워크 요청 모니터링
  const failedRequests: string[] = [];
  const requestUrls: Map<string, { status: number; contentType: string }> = new Map();

  page.on('response', async response => {
    const url = response.url();
    const status = response.status();
    const contentType = response.headers()['content-type'] || '';

    requestUrls.set(url, { status, contentType });

    if (status >= 400) {
      failedRequests.push(`${status} ${url}`);
    }

    // _next 정적 파일이 HTML을 반환하는지 확인
    if (url.includes('/_next/static/') && contentType.includes('text/html')) {
      console.log('❌ HTML returned for JS file:', url);
      console.log('   Content-Type:', contentType);
    }
  });

  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error') {
      console.log('❌ Console Error:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('❌ Page Error:', error.message);
  });

  console.log('\n🔍 FinHub 접속 시작...');

  // FinHub 페이지 접속
  const response = await page.goto('http://localhost:4400/finhub/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  console.log('\n📊 페이지 로드 결과:');
  console.log('   Status:', response?.status());
  console.log('   URL:', page.url());

  // 5초 대기 (JavaScript 로드 시간)
  await page.waitForTimeout(5000);

  // 스크린샷 저장
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/finhub-debug.png',
    fullPage: true
  });
  console.log('\n📸 스크린샷 저장: test-results/finhub-debug.png');

  // _next 요청 분석
  console.log('\n📂 _next 정적 파일 요청 분석:');
  let nextRequestCount = 0;
  let htmlResponseCount = 0;

  for (const [url, { status, contentType }] of requestUrls.entries()) {
    if (url.includes('/_next/static/')) {
      nextRequestCount++;
      const isHtml = contentType.includes('text/html');
      const isJs = url.endsWith('.js');

      if (isJs && isHtml) {
        htmlResponseCount++;
        console.log(`   ❌ ${url}`);
        console.log(`      Status: ${status}, Content-Type: ${contentType}`);
      }
    }
  }

  console.log(`\n   총 _next 요청: ${nextRequestCount}개`);
  console.log(`   HTML로 응답한 JS 파일: ${htmlResponseCount}개`);

  // 페이지 상태 확인
  const pageContent = await page.content();
  const hasLoadingText = pageContent.includes('로딩 중');
  const hasLoginText = pageContent.includes('로그인');

  console.log('\n📄 페이지 내용 분석:');
  console.log('   "로딩 중" 표시:', hasLoadingText ? '✓' : '✗');
  console.log('   "로그인" 표시:', hasLoginText ? '✓' : '✗');

  // 실패한 요청 출력
  if (failedRequests.length > 0) {
    console.log('\n⚠️  실패한 요청:');
    failedRequests.forEach(req => console.log('   ' + req));
  }

  // HTML 파일 내용에서 실제 요청되는 스크립트 경로 확인
  const scriptTags = await page.$$eval('script[src]', scripts =>
    scripts.map(s => s.getAttribute('src'))
  );

  console.log('\n🔗 HTML에서 로드하는 스크립트 경로:');
  scriptTags.slice(0, 5).forEach(src => {
    console.log('   ' + src);
  });

  // 진단 결과 요약
  console.log('\n' + '='.repeat(60));
  console.log('📊 진단 결과 요약:');
  console.log('='.repeat(60));

  if (htmlResponseCount > 0) {
    console.log('⚠️  문제: JavaScript 파일이 HTML로 응답됨');
    console.log('   원인: Nginx 또는 Express 라우팅 문제');
    console.log('   해결: 정적 파일 서빙 경로 확인 필요');
  } else if (hasLoadingText) {
    console.log('⚠️  문제: "로딩 중" 화면에서 멈춤');
    console.log('   원인: 프론트엔드 JavaScript 실행 문제');
  } else if (hasLoginText) {
    console.log('✅ 정상: 로그인 페이지로 리디렉트됨');
  } else {
    console.log('❓ 알 수 없는 상태');
  }
});
