# Nginx 리버스 프록시 기반 Cookie SSO 구현 리포트

**구현 일시**: 2026-01-04
**구현 대상**: WBHubManager, WBSalesHub, WBFinHub, WBOnboardingHub
**최종 상태**: ✅ 구현 완료 (테스트 필요)

---

## 1. 구현 목적

Docker 스테이징 및 운영 환경에서 **모든 허브에 쿠키 기반 SSO를 적용**하기 위해 Nginx 리버스 프록시를 도입하여 단일 포트를 통한 접근 구조로 변경합니다.

### 기존 문제점
- 각 허브가 서로 다른 포트를 사용 (4290, 4210, 4220, 4230)
- Same-Origin Policy로 인해 포트가 다르면 쿠키 공유 불가능
- URL 파라미터 방식 SSO는 보안상 취약하고 쿠키보다 관리가 어려움

### 해결 방안
- Nginx 리버스 프록시를 통해 단일 포트(4400)로 모든 허브 제공
- 경로 기반 라우팅: `/` (HubManager), `/saleshub`, `/finhub`, `/onboarding`
- 동일한 origin(http://localhost:4400)에서 쿠키 공유 가능

---

## 2. 포트 체계 변경

### 변경 전
| 환경 | HubManager | SalesHub | FinHub | OnboardingHub |
|------|-----------|----------|--------|---------------|
| 개발 (로컬) | 4090 | 4010 | 4020 | 4030 |
| 스테이징 (Docker) | 4290 | 4210 | 4220 | 4230 |
| 운영 (Oracle) | 4490 | 4410 | 4420 | 4430 |

### 변경 후
| 환경 | Nginx 포트 | HubManager | SalesHub | FinHub | OnboardingHub |
|------|-----------|-----------|----------|--------|---------------|
| 개발 (로컬) | - (사용 안 함) | 4090 | 4010 | 4020 | 4030 |
| 스테이징 (Docker) | **4400** | 내부 4090 | 내부 4010 | 내부 4020 | 내부 4030 |
| 운영 (Oracle) | **4500** | 내부 4090 | 내부 4010 | 내부 4020 | 내부 4030 |

**중요**:
- 스테이징/운영 환경에서는 Nginx 포트(4400/4500)로만 외부 접근 가능
- 각 허브의 내부 포트(4090, 4010 등)는 Docker 네트워크 내부에서만 사용
- 개발 환경은 기존대로 각 허브가 독립적인 포트 사용 (Nginx 없음)

---

## 3. 아키텍처 구조

### 스테이징 환경 (Docker)
```
[브라우저] → http://localhost:4400
                    ↓
              [Nginx:80]
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
[HubManager:4090] [SalesHub:4010] [FinHub:4020]
    /                /saleshub       /finhub
```

### 운영 환경 (Oracle)
```
[브라우저] → http://workhub.biz:4500
                    ↓
              [Nginx:80]
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
[HubManager:4090] [SalesHub:4010] [FinHub:4020]
    /                /saleshub       /finhub
```

---

## 4. 주요 변경사항

### 4.1 파일: `/home/peterchung/WBHubManager/.env`
**변경 내용**: 스테이징 환경 Docker 포트 변경
```diff
- DOCKER_HUBMANAGER_PORT="4290"
- DOCKER_SALESHUB_PORT="4210"
- DOCKER_FINHUB_PORT="4220"
- DOCKER_ONBOARDING_PORT="4230"
- DOCKER_TESTAGENT_PORT="4280"
+ DOCKER_HUBMANAGER_PORT="4400"
+ DOCKER_SALESHUB_PORT="4410"
+ DOCKER_FINHUB_PORT="4420"
+ DOCKER_ONBOARDING_PORT="4430"
+ DOCKER_TESTAGENT_PORT="4480"
```

### 4.2 파일: `/home/peterchung/WBHubManager/.env.prd`
**변경 내용**: 운영 환경 Docker 포트 변경
```diff
- DOCKER_HUBMANAGER_PORT="4490"
- DOCKER_SALESHUB_PORT="4410"
- DOCKER_FINHUB_PORT="4420"
- DOCKER_ONBOARDING_PORT="4430"
- DOCKER_TESTAGENT_PORT="4480"
+ DOCKER_HUBMANAGER_PORT="4500"
+ DOCKER_SALESHUB_PORT="4510"
+ DOCKER_FINHUB_PORT="4520"
+ DOCKER_ONBOARDING_PORT="4530"
+ DOCKER_TESTAGENT_PORT="4580"
```

### 4.3 파일: `/home/peterchung/WBHubManager/nginx/nginx.conf` (신규)
**설명**: Nginx 리버스 프록시 구성 파일

**주요 설정**:
- 단일 포트(80)로 모든 요청 수신
- 경로 기반 라우팅으로 각 허브로 프록시
- 쿠키 전달 활성화 (`proxy_pass_header Set-Cookie`, `proxy_set_header Cookie`)
- WebSocket 지원 (`proxy_http_version 1.1`, `Upgrade` 헤더)
- Gzip 압축, MIME 타입 설정

**라우팅 규칙**:
```nginx
location /            → http://wbhubmanager:4090 (HubManager)
location /saleshub    → http://wbsaleshub:4010   (SalesHub)
location /finhub      → http://wbfinhub:4020     (FinHub)
location /onboarding  → http://wbonboardinghub:4030 (OnboardingHub)
location /refhub      → http://wbrefhub:4099     (RefHub)
location /api/        → http://wbhubmanager:4090 (API 요청은 HubManager로)
location /_next/      → http://wbhubmanager:4090 (Next.js static assets)
```

### 4.4 파일: `/home/peterchung/WBHubManager/docker-compose.yml`
**변경 내용**:
1. **Nginx 서비스 추가** (24-43번 라인)
   ```yaml
   nginx:
     image: nginx:alpine
     container_name: wbhub-nginx
     ports:
       - "${DOCKER_HUBMANAGER_PORT:-4400}:80"
     volumes:
       - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
     depends_on:
       - wbhubmanager
       - wbsaleshub
       - wbfinhub
       - wbonboardinghub
   ```

2. **각 허브의 포트 노출 제거** (Nginx를 통해서만 접근)
   - HubManager: `ports` 섹션 주석 처리
   - SalesHub: `ports` 섹션 주석 처리
   - FinHub: `ports` 섹션 주석 처리
   - OnboardingHub: `ports` 섹션 주석 처리

3. **환경변수 URL 변경** (단일 포트 + 경로 기반)
   ```yaml
   # HubManager
   NEXT_PUBLIC_API_URL: ${DOCKER_HOST_URL:-http://localhost}:${DOCKER_HUBMANAGER_PORT:-4400}
   APP_URL: ${DOCKER_HOST_URL:-http://localhost}:${DOCKER_HUBMANAGER_PORT:-4400}
   GOOGLE_REDIRECT_URI: ${DOCKER_HOST_URL:-http://localhost}:${DOCKER_HUBMANAGER_PORT:-4400}/api/auth/google-callback

   # SalesHub
   NEXT_PUBLIC_HUB_MANAGER_URL: ${DOCKER_HOST_URL:-http://localhost}:${DOCKER_HUBMANAGER_PORT:-4400}
   FRONTEND_URL: ${DOCKER_HOST_URL:-http://localhost}:${DOCKER_HUBMANAGER_PORT:-4400}/saleshub

   # FinHub
   NEXT_PUBLIC_HUB_MANAGER_URL: ${DOCKER_HOST_URL:-http://localhost}:${DOCKER_HUBMANAGER_PORT:-4400}
   FRONTEND_URL: ${DOCKER_HOST_URL:-http://localhost}:${DOCKER_HUBMANAGER_PORT:-4400}/finhub

   # OnboardingHub
   NEXT_PUBLIC_HUB_MANAGER_URL: ${DOCKER_HOST_URL:-http://localhost}:${DOCKER_HUBMANAGER_PORT:-4400}
   FRONTEND_URL: ${DOCKER_HOST_URL:-http://localhost}:${DOCKER_HUBMANAGER_PORT:-4400}/onboarding
   ```

### 4.5 파일: `/home/peterchung/WBHubManager/server/routes/authRoutes.ts`
**변경 내용** (435-436번 라인):
```typescript
// 변경 전
const COOKIE_SSO_HUBS = ['wbrefhub'];

// 변경 후
const COOKIE_SSO_HUBS = ['wbsaleshub', 'wbfinhub', 'wbonboardinghub', 'wbrefhub'];
```

**설명**:
- 모든 허브가 쿠키 기반 SSO를 사용하도록 변경
- Nginx를 통해 동일한 origin(http://localhost:4400)에서 접근하므로 쿠키 공유 가능

---

## 5. Google OAuth 설정 변경 필요

### 기존 Redirect URI
```
http://localhost:4290/api/auth/google-callback
http://workhub.biz/api/auth/google-callback
```

### 신규 Redirect URI (추가 필요)
```
http://localhost:4400/api/auth/google-callback  ← 스테이징
http://workhub.biz:4500/api/auth/google-callback  ← 운영 (포트 명시)
```

**작업 필요**:
1. Google Cloud Console (https://console.cloud.google.com) 접속
2. 프로젝트 선택 → API 및 서비스 → 사용자 인증 정보
3. OAuth 2.0 클라이언트 ID 선택
4. 승인된 리디렉션 URI에 위 2개 URL 추가
5. 저장

---

## 6. 배포 및 테스트 절차

### 6.1 로컬 스테이징 환경 배포
```bash
cd /home/peterchung/WBHubManager

# 1. 기존 컨테이너 정리
docker compose down

# 2. 이미지 재빌드 (--no-cache 옵션으로 캐시 무효화)
docker compose build --no-cache

# 3. 컨테이너 시작
docker compose up -d

# 4. Nginx 로그 확인
docker logs wbhub-nginx

# 5. 각 허브 헬스체크
docker ps
docker logs wbhubmanager
docker logs wbsaleshub
docker logs wbfinhub
docker logs wbonboardinghub
```

### 6.2 테스트 시나리오

#### 테스트 1: Nginx를 통한 접근 확인
```bash
# HubManager (루트)
curl http://localhost:4400/api/health
# 예상 결과: {"status":"ok"}

# SalesHub
curl http://localhost:4400/saleshub/api/health
# 예상 결과: {"status":"ok"}

# FinHub
curl http://localhost:4400/finhub/api/health
# 예상 결과: {"status":"ok"}

# OnboardingHub
curl http://localhost:4400/onboarding/api/health
# 예상 결과: {"status":"ok"}
```

#### 테스트 2: 브라우저에서 Cookie SSO 플로우 검증
1. **브라우저 열기** (시크릿 모드)
2. **HubManager 접속**: http://localhost:4400/hubs
3. **Google 로그인** 수행
4. **SalesHub 카드 클릭**
5. **예상 동작**:
   - Google OAuth 인증 (이미 로그인되어 있으면 스킵)
   - HubManager가 쿠키 설정: `wbhub_access_token`
   - SalesHub로 리다이렉트: http://localhost:4400/saleshub/auth/sso-complete
   - SalesHub가 쿠키에서 토큰 읽어서 인증
   - SalesHub 대시보드로 리다이렉트: http://localhost:4400/saleshub/dashboard

#### 테스트 3: 쿠키 검증
1. **브라우저 개발자 도구 열기** (F12)
2. **Application → Cookies → http://localhost:4400**
3. **확인 항목**:
   - `wbhub_access_token` 쿠키 존재 여부
   - Domain: `localhost` (또는 비어 있음)
   - Path: `/`
   - HttpOnly: ✓
   - Secure: (HTTP 환경이므로 체크 해제됨)
   - SameSite: `Lax`

#### 테스트 4: Playwright 자동화 테스트
```bash
cd /home/peterchung/HWTestAgent

# 기존 테스트 스크립트 수정 (포트 4290 → 4400)
npx playwright test tests/docker-port-config.test.ts

# 예상 결과:
# ✓ HubManager가 올바른 포트(4400)로 응답
# ✓ JavaScript 번들에 localhost:4400 포함
# ✓ localhost:4290 미포함
```

---

## 7. 운영 환경 배포 (Oracle Cloud)

### 7.1 환경변수 업데이트
오라클 클라우드 서버에서 `.env.prd` 파일 확인:
```bash
ssh oracle-cloud
cd /home/ubuntu/WBHubManager
cat .env.prd | grep DOCKER_HUBMANAGER_PORT
# 출력: DOCKER_HUBMANAGER_PORT="4500"
```

### 7.2 Docker Compose 배포
```bash
# 오라클 서버에서 실행
cd /home/ubuntu/WBHubManager

# 1. Git pull (최신 코드 받기)
git pull origin main

# 2. .env.prd로 환경변수 설정
export $(cat .env.prd | xargs)

# 3. 기존 컨테이너 정리
docker compose -f docker-compose.yml down

# 4. 이미지 재빌드
docker compose -f docker-compose.yml build --no-cache

# 5. 컨테이너 시작
docker compose -f docker-compose.yml up -d

# 6. 로그 확인
docker logs wbhub-nginx
docker logs wbhubmanager
```

### 7.3 방화벽 설정 확인
```bash
# 포트 4500이 열려 있는지 확인
sudo ufw status | grep 4500

# 없으면 추가
sudo ufw allow 4500/tcp
```

### 7.4 운영 환경 테스트
```bash
# 외부에서 접근 테스트
curl http://workhub.biz:4500/api/health

# 브라우저에서 접근
# http://workhub.biz:4500/hubs
```

---

## 8. 트러블슈팅

### 문제 1: Nginx 컨테이너가 시작되지 않음
**증상**: `docker ps`에서 `wbhub-nginx` 컨테이너가 보이지 않음

**해결**:
```bash
# Nginx 로그 확인
docker logs wbhub-nginx

# 설정 파일 문법 검증
docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t

# 설정 파일 권한 확인
ls -l nginx/nginx.conf
# 644 권한이어야 함
```

### 문제 2: 쿠키가 설정되지 않음
**증상**: 브라우저 개발자 도구에서 `wbhub_access_token` 쿠키가 보이지 않음

**원인 및 해결**:
1. **HTTPS 환경에서 secure 쿠키 문제**:
   - 확인: `APP_URL`이 `https://`로 시작하는지 체크
   - 해결: HTTP 환경이면 `APP_URL`을 `http://`로 시작하도록 설정

2. **SameSite 정책 문제**:
   - 확인: `cookieOptions`에서 `sameSite: 'lax'` 설정되어 있는지
   - 해결: `authRoutes.ts:446` 확인

3. **도메인 불일치**:
   - 확인: 쿠키 도메인이 요청 도메인과 일치하는지
   - 해결: `COOKIE_DOMAIN` 환경변수 제거 (localhost는 도메인 설정 불필요)

### 문제 3: 경로 라우팅이 작동하지 않음
**증상**: http://localhost:4400/saleshub 접속 시 404 에러

**해결**:
```bash
# 1. Nginx 설정 리로드
docker exec wbhub-nginx nginx -s reload

# 2. SalesHub 컨테이너가 실행 중인지 확인
docker ps | grep wbsaleshub

# 3. Nginx에서 SalesHub로 연결되는지 확인
docker exec wbhub-nginx wget -q -O- http://wbsaleshub:4010/api/health
```

### 문제 4: Google OAuth redirect_uri_mismatch
**증상**: Google 로그인 시 "redirect_uri_mismatch" 에러

**해결**:
1. Google Cloud Console에서 Redirect URI 추가 확인
2. 정확한 URI: `http://localhost:4400/api/auth/google-callback`
3. 운영 환경: `http://workhub.biz:4500/api/auth/google-callback`

---

## 9. 롤백 절차

만약 문제가 발생하여 이전 버전으로 되돌려야 한다면:

```bash
# 1. Git에서 이전 커밋으로 되돌리기
git log --oneline  # 이전 커밋 해시 확인
git revert <commit-hash>  # 또는 git reset --hard <commit-hash>

# 2. 환경변수 원래 값으로 복구
# .env 파일에서:
DOCKER_HUBMANAGER_PORT="4290"
DOCKER_SALESHUB_PORT="4210"
DOCKER_FINHUB_PORT="4220"
DOCKER_ONBOARDING_PORT="4230"

# .env.prd 파일에서:
DOCKER_HUBMANAGER_PORT="4490"
DOCKER_SALESHUB_PORT="4410"
DOCKER_FINHUB_PORT="4420"
DOCKER_ONBOARDING_PORT="4430"

# 3. docker-compose.yml에서 각 허브의 ports 섹션 주석 해제

# 4. authRoutes.ts에서 COOKIE_SSO_HUBS를 ['wbrefhub']로 복구

# 5. 재빌드 및 배포
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## 10. 참고 자료

### 관련 파일
- **Nginx 구성**: [/home/peterchung/WBHubManager/nginx/nginx.conf](file:///home/peterchung/WBHubManager/nginx/nginx.conf)
- **Docker Compose**: [/home/peterchung/WBHubManager/docker-compose.yml](file:///home/peterchung/WBHubManager/docker-compose.yml)
- **Auth Routes**: [/home/peterchung/WBHubManager/server/routes/authRoutes.ts:435](file:///home/peterchung/WBHubManager/server/routes/authRoutes.ts#L435)
- **환경변수 (스테이징)**: [/home/peterchung/WBHubManager/.env:3](file:///home/peterchung/WBHubManager/.env#L3)
- **환경변수 (운영)**: [/home/peterchung/WBHubManager/.env.prd:3](file:///home/peterchung/WBHubManager/.env.prd#L3)

### 이전 디버깅 리포트
- **Docker 포트 설정 디버그 리포트**: [/home/peterchung/HWTestAgent/test-results/docker-port-config-debug-report.md](file:///home/peterchung/HWTestAgent/test-results/docker-port-config-debug-report.md)

### 외부 문서
- [Nginx Reverse Proxy 가이드](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [HTTP Cookie 정책 (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [Same-Origin Policy (MDN)](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)

---

**작성자**: Claude Code
**작성일**: 2026-01-04
**최종 수정**: 2026-01-04
