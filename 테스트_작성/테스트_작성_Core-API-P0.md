# 테스트_작성_Core-API-P0

**작성일:** 2026-01-02
**목적:** 시스템 장애 수준 Critical 기능 검증 (인증, SSO, DB 연결)
**대상 프로젝트:** WBHubManager, WBSalesHub, WBFinHub
**ISTQB 분류:** Priority 0 (Critical) - 실패 시 서비스 전체 중단

---

## 1. 개요

### 1.1 목적
P0 테스트는 **시스템의 핵심 기능이 정상 동작하는지** 검증합니다. 이 테스트가 실패하면 서비스 전체가 중단되거나 사용자가 시스템을 전혀 사용할 수 없는 상태를 의미합니다.

### 1.2 범위
| 검증 영역 | 설명 | 실패 시 영향 |
|----------|------|------------|
| 인증/보안 | JWT 토큰 라이프사이클 전체 | 모든 사용자 로그인 불가 |
| SSO 통신 | Hub 간 토큰 전달/검증 | 타 Hub 접근 불가 |
| 핵심 데이터 조회 | 주요 리소스 목록/상세 조회 | 업무 수행 불가 |
| 데이터베이스 연결 | 기본 CRUD 동작 | 데이터 처리 불가 |

### 1.3 ISTQB P0 정의
> **Priority 0 (Critical)**: Tasks or issues that are absolutely critical and require immediate action. System outage, security breaches, or critical bugs that can lead to system malfunction.
>
> 참조: [P0-P4 Priority Levels](https://fibery.io/blog/product-management/p0-p1-p2-p3-p4/)

### 1.4 기존 시나리오 대체
| 기존 시나리오 | 테스트 수 | 대체 여부 |
|-------------|----------|----------|
| AUTH | 7개 | **완전 대체** |
| SSO | 6-7개 | **완전 대체** |
| PRECISION (인증 부분) | 4개 | **부분 대체** |

---

## 2. 테스트 항목

### 2.1 공통 테스트 항목

#### 2.1.1 인증/보안 테스트
| 순번 | 테스트 ID | 테스트명 | 메서드 | 엔드포인트 | 예상 결과 |
|-----|----------|---------|-------|-----------|----------|
| 1 | P0-AUTH-001 | JWT Public Key 조회 | GET | `/api/auth/public-key` | 200, RS256 알고리즘 |
| 2 | P0-AUTH-002 | Access Token 발급 | POST | `/api/auth/google-login` | 200, accessToken + refreshToken |
| 3 | P0-AUTH-003 | Access Token 검증 | POST | `/api/auth/verify` | 200, valid: true |
| 4 | P0-AUTH-004 | Token 갱신 | POST | `/api/auth/refresh` | 200, 새 accessToken |
| 5 | P0-AUTH-005 | Token 폐기 (Logout) | POST | `/api/auth/jwt-logout` | 200, 토큰 무효화 |
| 6 | P0-AUTH-006 | 폐기된 토큰 거부 | POST | `/api/auth/verify` | 401, valid: false |
| 7 | P0-AUTH-007 | 잘못된 토큰 거부 | GET | `/api/hubs` | 401, Unauthorized |

#### 2.1.2 SSO 통신 테스트
| 순번 | 테스트 ID | 테스트명 | 메서드 | 엔드포인트 | 예상 결과 |
|-----|----------|---------|-------|-----------|----------|
| 8 | P0-SSO-001 | Hub 토큰 생성 | POST | `/api/auth/generate-hub-token` | 200, redirect_url |
| 9 | P0-SSO-002 | SSO 토큰으로 타 Hub 접근 | GET | `{HUB_URL}/api/health` | 200, 인증 성공 |
| 10 | P0-SSO-003 | SSO 로그아웃 후 접근 차단 | GET | `{HUB_URL}/api/{resource}` | 401, 토큰 무효 |

#### 2.1.3 핵심 데이터 조회 테스트
| 순번 | 테스트 ID | 테스트명 | 메서드 | 엔드포인트 | 예상 결과 |
|-----|----------|---------|-------|-----------|----------|
| 11 | P0-DATA-001 | 주요 리소스 목록 조회 | GET | `/api/{resource}` | 200, data: array |
| 12 | P0-DATA-002 | 주요 리소스 상세 조회 | GET | `/api/{resource}/:id` | 200, data: object |
| 13 | P0-DATA-003 | 데이터베이스 연결 확인 | GET | `/api/health` | 200, db: connected |

### 2.2 프로젝트별 매핑 테이블

| 테스트 ID | WBHubManager | WBSalesHub | WBFinHub |
|----------|--------------|------------|----------|
| P0-AUTH-001~007 | 직접 실행 | HubManager 호출 | HubManager 호출 |
| P0-SSO-001 | `/api/auth/generate-hub-token` | N/A (수신측) | N/A (수신측) |
| P0-SSO-002 | N/A (발신측) | `/api/customers` | `/api/accounts` |
| P0-DATA-001 | `/api/hubs` | `/api/customers` | `/api/accounts` |
| P0-DATA-002 | `/api/hubs/:id` | `/api/customers/:id` | `/api/accounts/:id` |

### 2.3 테스트 플로우
```
┌─────────────────────────────────────────────────────────────────┐
│                      P0 테스트 플로우                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Public Key   │───→│ Token 발급   │───→│ Token 검증   │      │
│  │ (P0-AUTH-001)│    │ (P0-AUTH-002)│    │ (P0-AUTH-003)│      │
│  └──────────────┘    └──────────────┘    └──────┬───────┘      │
│                                                  │              │
│                                                  ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Token 갱신   │───→│ SSO 토큰 생성│───→│ 타 Hub 접근  │      │
│  │ (P0-AUTH-004)│    │ (P0-SSO-001) │    │ (P0-SSO-002) │      │
│  └──────────────┘    └──────────────┘    └──────┬───────┘      │
│                                                  │              │
│                                                  ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ 데이터 조회  │───→│ Logout       │───→│ 토큰 무효화  │      │
│  │ (P0-DATA-001)│    │ (P0-AUTH-005)│    │ (P0-AUTH-006)│      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 테스트 시나리오 YAML 템플릿

### 3.1 WBHubManager용 P0 테스트

```yaml
# HWTestAgent/scenarios/wbhubmanager/core-api-p0.yaml
name: "WBHubManager Core API P0 Test"
description: "시스템 장애 수준 Critical 기능 검증 - 인증, SSO, 핵심 데이터"
type: CORE_API_P0
version: "2.0"

variables:
  PROJECT_URL: "https://wbhub.up.railway.app"
  SALESHUB_URL: "https://wbsaleshub.up.railway.app"
  FINHUB_URL: "https://wbfinhub.up.railway.app"
  TEST_EMAIL: "test-hwtest@wavebridge.kr"
  TEST_NAME: "HWTestAgent"

schedule:
  cron: "0 */6 * * *"  # 6시간마다
  on_deploy: true

timeout: 300000  # 5분

notify_on:
  - failure
  - recovery

steps:
  # ===== 인증/보안 테스트 =====
  - name: "P0-AUTH-001: JWT Public Key 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/auth/public-key"
    expect:
      status: 200
      json:
        publicKey: "@string"
        algorithm: "RS256"
        kid: "@string"

  - name: "P0-AUTH-002: Access Token 발급"
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
        expiresIn: "@number"
    save:
      ACCESS_TOKEN: "response.body.accessToken"
      REFRESH_TOKEN: "response.body.refreshToken"

  - name: "P0-AUTH-003: Access Token 검증"
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

  - name: "P0-AUTH-004: Token 갱신"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/auth/refresh"
      headers:
        Content-Type: "application/json"
      body:
        refreshToken: "{{REFRESH_TOKEN}}"
    expect:
      status: 200
      json:
        accessToken: "@string"
    save:
      NEW_ACCESS_TOKEN: "response.body.accessToken"

  # ===== 핵심 데이터 조회 =====
  - name: "P0-DATA-001: Hub 목록 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/hubs"
      headers:
        Authorization: "Bearer {{NEW_ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true
        data: "@array"

  - name: "P0-DATA-002: Hub 상세 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/hubs/wbsaleshub"
      headers:
        Authorization: "Bearer {{NEW_ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  # ===== SSO 통신 =====
  - name: "P0-SSO-001: SalesHub용 토큰 생성"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/auth/generate-hub-token"
      headers:
        Authorization: "Bearer {{NEW_ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        hub_slug: "wbsaleshub"
    expect:
      status: 200
      json:
        token: "@string"
        redirect_url: "@string"
    save:
      SSO_TOKEN: "response.body.token"

  - name: "P0-SSO-002: SSO 토큰으로 SalesHub 접근"
    type: http
    request:
      method: GET
      url: "{{SALESHUB_URL}}/api/customers"
      headers:
        Authorization: "Bearer {{SSO_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  # ===== 보안 테스트 =====
  - name: "P0-AUTH-007: 잘못된 토큰 거부"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/hubs"
      headers:
        Authorization: "Bearer invalid_token_12345"
    expect:
      status: 401

  # ===== Logout 및 토큰 무효화 =====
  - name: "P0-AUTH-005: Logout (토큰 폐기)"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/auth/jwt-logout"
      headers:
        Content-Type: "application/json"
      body:
        refreshToken: "{{REFRESH_TOKEN}}"
    expect:
      status: 200

  - name: "P0-AUTH-006: 폐기된 토큰 거부 확인"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/auth/verify"
      headers:
        Content-Type: "application/json"
      body:
        token: "{{ACCESS_TOKEN}}"
    expect:
      status: 401
      json:
        valid: false
```

### 3.2 WBSalesHub용 P0 테스트

```yaml
# HWTestAgent/scenarios/wbsaleshub/core-api-p0.yaml
name: "WBSalesHub Core API P0 Test"
description: "시스템 장애 수준 Critical 기능 검증 - SSO 인증, 핵심 데이터"
type: CORE_API_P0
version: "2.0"

variables:
  PROJECT_URL: "https://wbsaleshub.up.railway.app"
  HUBMANAGER_URL: "https://wbhub.up.railway.app"
  TEST_EMAIL: "test-hwtest@wavebridge.kr"
  TEST_NAME: "HWTestAgent"

schedule:
  cron: "0 */6 * * *"
  on_deploy: true

timeout: 300000

notify_on:
  - failure
  - recovery

steps:
  # ===== HubManager에서 토큰 발급 =====
  - name: "P0-AUTH-001: HubManager Public Key 조회"
    type: http
    request:
      method: GET
      url: "{{HUBMANAGER_URL}}/api/auth/public-key"
    expect:
      status: 200
      json:
        publicKey: "@string"
        algorithm: "RS256"

  - name: "P0-AUTH-002: HubManager 토큰 발급"
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
      REFRESH_TOKEN: "response.body.refreshToken"

  - name: "P0-AUTH-003: 토큰 검증"
    type: http
    request:
      method: POST
      url: "{{HUBMANAGER_URL}}/api/auth/verify"
      headers:
        Content-Type: "application/json"
      body:
        token: "{{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        valid: true

  # ===== SSO 인증 접근 =====
  - name: "P0-SSO-001: SSO 토큰으로 API 접근"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/health"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200

  # ===== 핵심 데이터 조회 =====
  - name: "P0-DATA-001: Customer 목록 조회"
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
        data: "@array"

  - name: "P0-DATA-002: Product 목록 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/products"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  # ===== 보안 테스트 =====
  - name: "P0-AUTH-007: 잘못된 토큰 거부"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers"
      headers:
        Authorization: "Bearer invalid_token"
    expect:
      status: 401

  # ===== Logout 후 접근 차단 =====
  - name: "P0-AUTH-005: HubManager Logout"
    type: http
    request:
      method: POST
      url: "{{HUBMANAGER_URL}}/api/auth/jwt-logout"
      headers:
        Content-Type: "application/json"
      body:
        refreshToken: "{{REFRESH_TOKEN}}"
    expect:
      status: 200

  - name: "P0-SSO-003: 로그아웃 후 접근 차단 확인"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 401
```

### 3.3 WBFinHub용 P0 테스트

```yaml
# HWTestAgent/scenarios/wbfinhub/core-api-p0.yaml
name: "WBFinHub Core API P0 Test"
description: "시스템 장애 수준 Critical 기능 검증 - SSO 인증, 핵심 데이터"
type: CORE_API_P0
version: "2.0"

variables:
  PROJECT_URL: "https://wbfinhub.up.railway.app"
  HUBMANAGER_URL: "https://wbhub.up.railway.app"
  TEST_EMAIL: "test-hwtest@wavebridge.kr"
  TEST_NAME: "HWTestAgent"

schedule:
  cron: "0 */6 * * *"
  on_deploy: true

timeout: 300000

notify_on:
  - failure
  - recovery

steps:
  # ===== HubManager에서 토큰 발급 =====
  - name: "P0-AUTH-001: HubManager Public Key 조회"
    type: http
    request:
      method: GET
      url: "{{HUBMANAGER_URL}}/api/auth/public-key"
    expect:
      status: 200
      json:
        publicKey: "@string"
        algorithm: "RS256"

  - name: "P0-AUTH-002: HubManager 토큰 발급"
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
      REFRESH_TOKEN: "response.body.refreshToken"

  - name: "P0-AUTH-003: 토큰 검증"
    type: http
    request:
      method: POST
      url: "{{HUBMANAGER_URL}}/api/auth/verify"
      headers:
        Content-Type: "application/json"
      body:
        token: "{{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        valid: true

  # ===== SSO 인증 접근 =====
  - name: "P0-SSO-001: SSO 토큰으로 API 접근"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/health"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200

  # ===== 핵심 데이터 조회 =====
  - name: "P0-DATA-001: Account 목록 조회"
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
        data: "@array"

  - name: "P0-DATA-002: Transaction 목록 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/transactions"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  # ===== 보안 테스트 =====
  - name: "P0-AUTH-007: 잘못된 토큰 거부"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts"
      headers:
        Authorization: "Bearer invalid_token"
    expect:
      status: 401

  # ===== Logout 후 접근 차단 =====
  - name: "P0-AUTH-005: HubManager Logout"
    type: http
    request:
      method: POST
      url: "{{HUBMANAGER_URL}}/api/auth/jwt-logout"
      headers:
        Content-Type: "application/json"
      body:
        refreshToken: "{{REFRESH_TOKEN}}"
    expect:
      status: 200

  - name: "P0-SSO-003: 로그아웃 후 접근 차단 확인"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 401
```

---

## 4. 실행 조건

### 4.1 실행 주기
| 트리거 | 조건 | 우선순위 |
|-------|------|---------|
| 배포 전 | 모든 프로덕션 배포 전 필수 (Smoke 통과 후) | **최우선** |
| 정기 실행 | 6시간마다 (0, 6, 12, 18시) | 높음 |
| 장애 발생 시 | 인증 관련 이슈 보고 시 즉시 | 긴급 |

### 4.2 타임아웃 설정
| 항목 | 값 | 설명 |
|-----|---|------|
| 전체 타임아웃 | 300초 (5분) | 모든 테스트 완료 기준 |
| 개별 요청 타임아웃 | 30초 | 토큰 발급 등 복잡한 요청 |
| 재시도 횟수 | 3회 | 네트워크 이슈 대응 |

### 4.3 실행 순서
```
Smoke Test (PASSED) → P0 Test → P1 Test → P2 Test
                        ↑
                    현재 위치
```

---

## 5. 성공/실패 기준

### 5.1 Pass 조건
- [ ] 모든 인증 테스트(P0-AUTH-001~007) 통과
- [ ] 모든 SSO 테스트(P0-SSO-001~003) 통과
- [ ] 모든 데이터 조회 테스트(P0-DATA-001~003) 통과
- [ ] 전체 실행 시간 300초 이내

### 5.2 Fail 조건
| 조건 | 심각도 | 조치 |
|-----|-------|------|
| 토큰 발급 실패 | **Critical** | 배포 즉시 중단, 인증 서버 점검 |
| 토큰 검증 실패 | **Critical** | 배포 즉시 중단, JWT 설정 점검 |
| SSO 통신 실패 | **Critical** | 배포 즉시 중단, Hub 간 통신 점검 |
| 핵심 데이터 조회 실패 | **Critical** | 배포 즉시 중단, DB 연결 점검 |
| 보안 테스트 실패 (토큰 거부 안 됨) | **Critical** | 배포 즉시 중단, 보안 취약점 |

### 5.3 배포 차단 기준
```
P0 테스트 실패 시 → 무조건 배포 차단

모든 P0 테스트는 Critical 등급으로,
단 1개라도 실패 시 프로덕션 배포가 차단됩니다.
```

---

## 6. 기존 시나리오 대체 매핑

### 6.1 대체되는 기존 시나리오

| 기존 파일 | 신규 파일 | 대체 범위 |
|----------|----------|----------|
| `wbhubmanager/auth.yaml` | `wbhubmanager/core-api-p0.yaml` | 완전 대체 |
| `wbhubmanager/auth-*.yaml` | `wbhubmanager/core-api-p0-*.yaml` | 완전 대체 |
| `wbsaleshub/sso-integration.yaml` | `wbsaleshub/core-api-p0.yaml` | 완전 대체 |
| `wbsaleshub/sso-integration-*.yaml` | `wbsaleshub/core-api-p0-*.yaml` | 완전 대체 |
| `wbfinhub/sso-integration.yaml` | `wbfinhub/core-api-p0.yaml` | 완전 대체 |
| `wbfinhub/sso-integration-*.yaml` | `wbfinhub/core-api-p0-*.yaml` | 완전 대체 |

### 6.2 마이그레이션 체크리스트
- [ ] 기존 `auth.yaml`, `sso-integration.yaml` 백업
- [ ] 신규 `core-api-p0.yaml` 파일 생성
- [ ] 환경별 변수 파일 생성
- [ ] 스케줄러에서 기존 시나리오 비활성화
- [ ] 신규 시나리오 등록
- [ ] 테스트 실행 및 검증
- [ ] 기존 시나리오 아카이브

---

**문서 버전:** 1.0
**작성:** Claude Code
**최종 수정:** 2026-01-02
