# 테스트_작성_Smoke

**작성일:** 2026-01-02
**목적:** 배포 전 최소한의 시스템 가동 확인 (Health + Me + 인증 + Frontend)
**대상 프로젝트:** WBHubManager, WBSalesHub, WBFinHub
**ISTQB 분류:** Smoke Test (Build Verification Test)

---

## 1. 개요

### 1.1 목적
스모크 테스트는 새로운 빌드나 배포 전에 **시스템의 기본적인 기능이 동작하는지** 빠르게 확인하는 테스트입니다. 깊이 있는 테스트가 아닌, "시스템이 켜지는가?"를 확인하는 최소한의 검증입니다.

### 1.2 범위
| 검증 영역 | 설명 |
|----------|------|
| Health Check | 서버 프로세스 정상 가동 여부 |
| Me 엔드포인트 | 인증 시스템 기본 동작 여부 |
| 인증 플로우 | 토큰 발급 및 검증 가능 여부 |
| Frontend | 프론트엔드 페이지 로딩 여부 |

### 1.3 ISTQB 정의
> **Smoke Test**: A test suite that covers the main functionality of a component or system to determine whether it works properly before planned testing begins.
>
> 출처: [ISTQB Glossary](https://istqb-glossary.page/)

### 1.4 기존 시나리오 대체
| 기존 시나리오 | 테스트 수 | 대체 여부 |
|-------------|----------|----------|
| GENERAL | 4개 | **완전 대체** |

---

## 2. 테스트 항목

### 2.1 공통 테스트 항목

| 순번 | 테스트 ID | 테스트명 | 메서드 | 엔드포인트 | 예상 결과 |
|-----|----------|---------|-------|-----------|----------|
| 1 | SMOKE-001 | Health Check | GET | `/api/health` | 200 OK, `success: true` |
| 2 | SMOKE-002 | JWT Public Key 조회 | GET | `/api/auth/public-key` | 200 OK, `publicKey` 존재 |
| 3 | SMOKE-003 | 토큰 발급 테스트 | POST | `/api/auth/google-login` | 200 OK, `accessToken` 반환 |
| 4 | SMOKE-004 | 토큰 검증 테스트 | POST | `/api/auth/verify` | 200 OK, `valid: true` |
| 5 | SMOKE-005 | Frontend 접근 | GET | `/` | 200 OK, HTML 반환 |

### 2.2 프로젝트별 매핑 테이블

| 테스트 ID | WBHubManager | WBSalesHub | WBFinHub |
|----------|--------------|------------|----------|
| SMOKE-001 | `/api/health` | `/api/health` | `/api/health` |
| SMOKE-002 | `/api/auth/public-key` | HubManager에서 조회 | HubManager에서 조회 |
| SMOKE-003 | `/api/auth/google-login` | HubManager에서 발급 | HubManager에서 발급 |
| SMOKE-004 | `/api/auth/verify` | HubManager에서 검증 | HubManager에서 검증 |
| SMOKE-005 | `/` | `/` | `/` |

### 2.3 테스트 의존성
```
SMOKE-001 (Health) ─────────────────────────┐
                                            │
SMOKE-002 (Public Key) ─────────────────────┼──→ SMOKE-005 (Frontend)
                                            │
SMOKE-003 (토큰 발급) ──→ SMOKE-004 (토큰 검증) ─┘
```

---

## 3. 테스트 시나리오 YAML 템플릿

### 3.1 WBHubManager용 스모크 테스트

```yaml
# HWTestAgent/scenarios/wbhubmanager/smoke.yaml
name: "WBHubManager Smoke Test"
description: "배포 전 최소 검증 - Health, Auth, Frontend"
type: SMOKE
version: "2.0"

variables:
  PROJECT_URL: "https://wbhub.up.railway.app"
  TEST_EMAIL: "test-hwtest@wavebridge.kr"
  TEST_NAME: "HWTestAgent"

schedule:
  cron: "0 */4 * * *"  # 4시간마다
  on_deploy: true       # 배포 시 자동 실행

timeout: 120000  # 2분

notify_on:
  - failure
  - recovery

steps:
  - name: "SMOKE-001: Health Check"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/health"
    expect:
      status: 200
      json:
        success: true

  - name: "SMOKE-002: JWT Public Key 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/auth/public-key"
    expect:
      status: 200
      json:
        publicKey: "@string"
        algorithm: "RS256"

  - name: "SMOKE-003: 토큰 발급 테스트"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/auth/google-login"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{TEST_EMAIL}}"
        name: "{{TEST_NAME}}"
    expect:
      status: 200
      json:
        accessToken: "@string"
        refreshToken: "@string"
    save:
      ACCESS_TOKEN: "response.body.accessToken"

  - name: "SMOKE-004: 토큰 검증 테스트"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/auth/verify"
      headers:
        Content-Type: "application/json"
      body:
        token: "{{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        valid: true
        user:
          email: "{{TEST_EMAIL}}"

  - name: "SMOKE-005: Frontend 접근"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/"
    expect:
      status: 200
      headers:
        content-type: "@contains text/html"
```

### 3.2 WBSalesHub용 스모크 테스트

```yaml
# HWTestAgent/scenarios/wbsaleshub/smoke.yaml
name: "WBSalesHub Smoke Test"
description: "배포 전 최소 검증 - Health, SSO Auth, Frontend"
type: SMOKE
version: "2.0"

variables:
  PROJECT_URL: "https://wbsaleshub.up.railway.app"
  HUBMANAGER_URL: "https://wbhub.up.railway.app"
  TEST_EMAIL: "test-hwtest@wavebridge.kr"
  TEST_NAME: "HWTestAgent"

schedule:
  cron: "0 */4 * * *"
  on_deploy: true

timeout: 120000

notify_on:
  - failure
  - recovery

steps:
  - name: "SMOKE-001: Health Check"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/health"
    expect:
      status: 200
      json:
        success: true

  - name: "SMOKE-002: HubManager Public Key 조회"
    type: http
    request:
      method: GET
      url: "{{HUBMANAGER_URL}}/api/auth/public-key"
    expect:
      status: 200
      json:
        publicKey: "@string"

  - name: "SMOKE-003: HubManager 토큰 발급"
    type: http
    request:
      method: POST
      url: "{{HUBMANAGER_URL}}/api/auth/google-login"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{TEST_EMAIL}}"
        name: "{{TEST_NAME}}"
    expect:
      status: 200
    save:
      ACCESS_TOKEN: "response.body.accessToken"

  - name: "SMOKE-004: SSO 토큰으로 API 접근"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  - name: "SMOKE-005: Frontend 접근"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/"
    expect:
      status: 200
      headers:
        content-type: "@contains text/html"
```

### 3.3 WBFinHub용 스모크 테스트

```yaml
# HWTestAgent/scenarios/wbfinhub/smoke.yaml
name: "WBFinHub Smoke Test"
description: "배포 전 최소 검증 - Health, SSO Auth, Frontend"
type: SMOKE
version: "2.0"

variables:
  PROJECT_URL: "https://wbfinhub.up.railway.app"
  HUBMANAGER_URL: "https://wbhub.up.railway.app"
  TEST_EMAIL: "test-hwtest@wavebridge.kr"
  TEST_NAME: "HWTestAgent"

schedule:
  cron: "0 */4 * * *"
  on_deploy: true

timeout: 120000

notify_on:
  - failure
  - recovery

steps:
  - name: "SMOKE-001: Health Check"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/health"
    expect:
      status: 200
      json:
        success: true

  - name: "SMOKE-002: HubManager Public Key 조회"
    type: http
    request:
      method: GET
      url: "{{HUBMANAGER_URL}}/api/auth/public-key"
    expect:
      status: 200
      json:
        publicKey: "@string"

  - name: "SMOKE-003: HubManager 토큰 발급"
    type: http
    request:
      method: POST
      url: "{{HUBMANAGER_URL}}/api/auth/google-login"
      headers:
        Content-Type: "application/json"
      body:
        email: "{{TEST_EMAIL}}"
        name: "{{TEST_NAME}}"
    expect:
      status: 200
    save:
      ACCESS_TOKEN: "response.body.accessToken"

  - name: "SMOKE-004: SSO 토큰으로 API 접근"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  - name: "SMOKE-005: Frontend 접근"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/"
    expect:
      status: 200
      headers:
        content-type: "@contains text/html"
```

### 3.4 환경별 변수 오버라이드

| 환경 | WBHubManager | WBSalesHub | WBFinHub |
|-----|--------------|------------|----------|
| Production | `https://wbhub.up.railway.app` | `https://wbsaleshub.up.railway.app` | `https://wbfinhub.up.railway.app` |
| Development | `http://localhost:4001` | `http://localhost:4021` | `http://localhost:4020` |
| Docker | `http://hubmanager:4001` | `http://saleshub:4021` | `http://finhub:4020` |
| Oracle | `http://158.180.95.246:4090` | `http://158.180.95.246:4091` | `http://158.180.95.246:4092` |

---

## 4. 실행 조건

### 4.1 실행 주기
| 트리거 | 조건 | 우선순위 |
|-------|------|---------|
| 배포 전 | 모든 프로덕션 배포 전 필수 실행 | **최우선** |
| 정기 실행 | 4시간마다 (0, 4, 8, 12, 16, 20시) | 높음 |
| 수동 실행 | 장애 발생 시 즉시 실행 | 높음 |

### 4.2 타임아웃 설정
| 항목 | 값 | 설명 |
|-----|---|------|
| 전체 타임아웃 | 120초 (2분) | 모든 테스트 완료 기준 |
| 개별 요청 타임아웃 | 10초 | 단일 HTTP 요청 기준 |
| 재시도 횟수 | 2회 | 실패 시 자동 재시도 |

### 4.3 알림 설정
```yaml
notify_on:
  - failure    # 테스트 실패 시 즉시 알림
  - recovery   # 실패 후 복구 시 알림

notification_channels:
  - slack: "#ops-alerts"
  - email: "devops@wavebridge.kr"
```

---

## 5. 성공/실패 기준

### 5.1 Pass 조건
- [ ] 모든 5개 테스트 항목 통과
- [ ] 전체 실행 시간 120초 이내
- [ ] HTTP 응답 코드가 예상 값과 일치
- [ ] JSON 응답 구조가 예상과 일치

### 5.2 Fail 조건
| 조건 | 심각도 | 조치 |
|-----|-------|------|
| Health Check 실패 | **Critical** | 배포 즉시 중단 |
| 토큰 발급 실패 | **Critical** | 배포 즉시 중단 |
| 토큰 검증 실패 | **Critical** | 배포 즉시 중단 |
| Frontend 접근 실패 | **High** | 배포 검토 필요 |
| 타임아웃 초과 | **High** | 성능 점검 필요 |

### 5.3 배포 차단 기준
```
스모크 테스트 실패 시:
├── SMOKE-001 (Health) 실패 → 배포 차단
├── SMOKE-002 (Public Key) 실패 → 배포 차단
├── SMOKE-003 (토큰 발급) 실패 → 배포 차단
├── SMOKE-004 (토큰 검증) 실패 → 배포 차단
└── SMOKE-005 (Frontend) 실패 → 배포 검토 (선택적 차단)
```

---

## 6. 기존 시나리오 대체 매핑

### 6.1 대체되는 기존 시나리오

| 기존 파일 | 신규 파일 | 변경 사항 |
|----------|----------|----------|
| `wbhubmanager/general.yaml` | `wbhubmanager/smoke.yaml` | 완전 대체 |
| `wbhubmanager/general-development.yaml` | `wbhubmanager/smoke-development.yaml` | 완전 대체 |
| `wbhubmanager/general-staging.yaml` | `wbhubmanager/smoke-staging.yaml` | 완전 대체 |
| `wbhubmanager/general-docker.yaml` | `wbhubmanager/smoke-docker.yaml` | 완전 대체 |
| `wbsaleshub/general*.yaml` | `wbsaleshub/smoke*.yaml` | 완전 대체 |
| `wbfinhub/general*.yaml` | `wbfinhub/smoke*.yaml` | 완전 대체 |

### 6.2 마이그레이션 체크리스트
- [ ] 기존 `general.yaml` 파일 백업
- [ ] 신규 `smoke.yaml` 파일 생성
- [ ] 환경별 변수 파일 생성 (development, staging, docker)
- [ ] 스케줄러 설정 업데이트
- [ ] 기존 시나리오 비활성화
- [ ] 신규 시나리오 테스트 실행
- [ ] 모니터링 대시보드 업데이트

---

## 7. 테스트 결과 예시

### 7.1 성공 시
```json
{
  "scenario": "WBHubManager Smoke Test",
  "status": "PASSED",
  "duration": 4523,
  "timestamp": "2026-01-02T10:00:00Z",
  "results": [
    { "id": "SMOKE-001", "name": "Health Check", "status": "PASSED", "duration": 245 },
    { "id": "SMOKE-002", "name": "JWT Public Key 조회", "status": "PASSED", "duration": 312 },
    { "id": "SMOKE-003", "name": "토큰 발급 테스트", "status": "PASSED", "duration": 1823 },
    { "id": "SMOKE-004", "name": "토큰 검증 테스트", "status": "PASSED", "duration": 892 },
    { "id": "SMOKE-005", "name": "Frontend 접근", "status": "PASSED", "duration": 1251 }
  ]
}
```

### 7.2 실패 시
```json
{
  "scenario": "WBHubManager Smoke Test",
  "status": "FAILED",
  "duration": 10234,
  "timestamp": "2026-01-02T10:00:00Z",
  "results": [
    { "id": "SMOKE-001", "name": "Health Check", "status": "PASSED", "duration": 245 },
    { "id": "SMOKE-002", "name": "JWT Public Key 조회", "status": "PASSED", "duration": 312 },
    {
      "id": "SMOKE-003",
      "name": "토큰 발급 테스트",
      "status": "FAILED",
      "duration": 10000,
      "error": {
        "type": "TIMEOUT",
        "message": "Request timed out after 10000ms",
        "expected": "200 OK",
        "actual": "No response"
      }
    }
  ],
  "recommendation": "인증 서버 상태 확인 필요. 배포 진행 불가."
}
```

---

**문서 버전:** 1.0
**작성:** Claude Code
**최종 수정:** 2026-01-02
