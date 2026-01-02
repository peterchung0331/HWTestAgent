# 테스트_작성_Core-API-P1

**작성일:** 2026-01-02
**목적:** 핵심 기능 오류 수준 High 기능 검증 (CRUD, 권한, 데이터 무결성)
**대상 프로젝트:** WBHubManager, WBSalesHub, WBFinHub
**ISTQB 분류:** Priority 1 (High) - 실패 시 핵심 업무 수행 불가

---

## 1. 개요

### 1.1 목적
P1 테스트는 **핵심 비즈니스 기능이 정상 동작하는지** 검증합니다. 이 테스트가 실패하면 사용자가 핵심 업무를 수행할 수 없거나, 데이터 무결성에 문제가 발생할 수 있습니다.

### 1.2 범위
| 검증 영역 | 설명 | 실패 시 영향 |
|----------|------|------------|
| CRUD 전체 | 생성, 조회, 수정, 삭제 | 데이터 관리 불가 |
| 관계 데이터 | 하위 리소스 접근 | 연관 데이터 조회 불가 |
| 권한 검증 | 401/403 응답 | 보안 취약점 |
| 데이터 무결성 | 필수 필드 검증 | 잘못된 데이터 저장 |

### 1.3 ISTQB P1 정의
> **Priority 1 (High)**: P1 tasks are high-priority, second only to P0. These issues can affect the project's progress or user experience but typically don't cause a complete breakdown of functionality.
>
> 참조: [P0-P4 Priority Levels](https://fibery.io/blog/product-management/p0-p1-p2-p3-p4/)

### 1.4 기존 시나리오 대체
| 기존 시나리오 | 테스트 수 | 대체 여부 |
|-------------|----------|----------|
| PRECISION | 9개 | **완전 대체** |

---

## 2. 테스트 항목

### 2.1 공통 테스트 항목

#### 2.1.1 CRUD 테스트
| 순번 | 테스트 ID | 테스트명 | 메서드 | 엔드포인트 | 예상 결과 |
|-----|----------|---------|-------|-----------|----------|
| 1 | P1-CRUD-001 | 리소스 생성 | POST | `/api/{resource}` | 201 Created |
| 2 | P1-CRUD-002 | 생성된 리소스 조회 | GET | `/api/{resource}/:id` | 200, 생성 데이터 일치 |
| 3 | P1-CRUD-003 | 리소스 수정 | PUT | `/api/{resource}/:id` | 200, 수정 반영 |
| 4 | P1-CRUD-004 | 수정된 리소스 확인 | GET | `/api/{resource}/:id` | 200, 수정 데이터 일치 |
| 5 | P1-CRUD-005 | 리소스 삭제 | DELETE | `/api/{resource}/:id` | 200 또는 204 |
| 6 | P1-CRUD-006 | 삭제된 리소스 조회 | GET | `/api/{resource}/:id` | 404 Not Found |

#### 2.1.2 관계 데이터 테스트
| 순번 | 테스트 ID | 테스트명 | 메서드 | 엔드포인트 | 예상 결과 |
|-----|----------|---------|-------|-----------|----------|
| 7 | P1-REL-001 | 하위 리소스 목록 조회 | GET | `/api/{parent}/:id/{child}` | 200, data: array |
| 8 | P1-REL-002 | 하위 리소스 생성 | POST | `/api/{parent}/:id/{child}` | 201 Created |
| 9 | P1-REL-003 | 하위 리소스 상세 조회 | GET | `/api/{child}/:id` | 200, parent 참조 포함 |

#### 2.1.3 권한 검증 테스트
| 순번 | 테스트 ID | 테스트명 | 메서드 | 조건 | 예상 결과 |
|-----|----------|---------|-------|------|----------|
| 10 | P1-AUTH-001 | 인증 없이 조회 | GET | 토큰 없음 | 401 Unauthorized |
| 11 | P1-AUTH-002 | 인증 없이 생성 | POST | 토큰 없음 | 401 Unauthorized |
| 12 | P1-AUTH-003 | 인증 없이 수정 | PUT | 토큰 없음 | 401 Unauthorized |
| 13 | P1-AUTH-004 | 인증 없이 삭제 | DELETE | 토큰 없음 | 401 Unauthorized |
| 14 | P1-AUTH-005 | 권한 없는 리소스 접근 | GET | 타인 리소스 | 403 Forbidden |

#### 2.1.4 데이터 무결성 테스트
| 순번 | 테스트 ID | 테스트명 | 메서드 | 조건 | 예상 결과 |
|-----|----------|---------|-------|------|----------|
| 15 | P1-VAL-001 | 필수 필드 누락 | POST | body 불완전 | 400 Bad Request |
| 16 | P1-VAL-002 | 잘못된 데이터 타입 | POST | 타입 불일치 | 400 Bad Request |
| 17 | P1-VAL-003 | 중복 데이터 생성 | POST | unique 위반 | 409 Conflict |

### 2.2 프로젝트별 매핑 테이블

| 테스트 ID | WBHubManager | WBSalesHub | WBFinHub |
|----------|--------------|------------|----------|
| P1-CRUD-* | Documents | Customers | Accounts |
| P1-REL-001 | Hubs → Documents | Customers → Contacts | Accounts → Wallets |
| P1-REL-002 | N/A | Customers → Meetings | Accounts → Transactions |
| P1-AUTH-* | `/api/documents` | `/api/customers` | `/api/accounts` |
| P1-VAL-* | Document 생성 | Customer 생성 | Account 생성 |

### 2.3 CRUD 테스트 플로우
```
┌────────────────────────────────────────────────────────────────┐
│                     P1 CRUD 테스트 플로우                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │  CREATE  │───→│   READ   │───→│  UPDATE  │───→│   READ   │ │
│  │ (POST)   │    │  (GET)   │    │  (PUT)   │    │  (GET)   │ │
│  │ 201      │    │ 200      │    │ 200      │    │ 200      │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                                      │         │
│                                                      ▼         │
│                                       ┌──────────┐    ┌──────────┐
│                                       │  DELETE  │───→│   READ   │
│                                       │ (DELETE) │    │  (GET)   │
│                                       │ 200/204  │    │ 404      │
│                                       └──────────┘    └──────────┘
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. 테스트 시나리오 YAML 템플릿

### 3.1 WBHubManager용 P1 테스트

```yaml
# HWTestAgent/scenarios/wbhubmanager/core-api-p1.yaml
name: "WBHubManager Core API P1 Test"
description: "핵심 기능 검증 - CRUD, 권한, 데이터 무결성"
type: CORE_API_P1
version: "2.0"

variables:
  PROJECT_URL: "https://wbhub.up.railway.app"
  TEST_EMAIL: "test-hwtest@wavebridge.kr"
  TEST_NAME: "HWTestAgent"
  TEST_DOC_TITLE: "P1 테스트 문서"
  TEST_DOC_CONTENT: "자동화 테스트용 문서입니다."

schedule:
  cron: "0 8,20 * * *"  # 하루 2회 (8시, 20시)
  on_deploy: true

timeout: 300000  # 5분

notify_on:
  - failure
  - recovery

steps:
  # ===== 인증 토큰 발급 =====
  - name: "Setup: 토큰 발급"
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
    save:
      ACCESS_TOKEN: "response.body.accessToken"

  # ===== CRUD 테스트 =====
  - name: "P1-CRUD-001: Document 생성"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/documents"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        title: "{{TEST_DOC_TITLE}}"
        content: "{{TEST_DOC_CONTENT}}"
        hub: "wbhubmanager"
        category: "test"
        slug: "p1-test-{{$timestamp}}"
        published: false
    expect:
      status: 201
      json:
        success: true
    save:
      DOC_ID: "response.body.data.id"
      DOC_SLUG: "response.body.data.slug"

  - name: "P1-CRUD-002: 생성된 Document 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/documents/wbhubmanager/test/{{DOC_SLUG}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true
        data:
          title: "{{TEST_DOC_TITLE}}"

  - name: "P1-CRUD-003: Document 수정"
    type: http
    request:
      method: PUT
      url: "{{PROJECT_URL}}/api/documents/wbhubmanager/test/{{DOC_SLUG}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        title: "{{TEST_DOC_TITLE}} - 수정됨"
        content: "{{TEST_DOC_CONTENT}} - 업데이트"
    expect:
      status: 200
      json:
        success: true

  - name: "P1-CRUD-004: 수정된 Document 확인"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/documents/wbhubmanager/test/{{DOC_SLUG}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        data:
          title: "{{TEST_DOC_TITLE}} - 수정됨"

  - name: "P1-CRUD-005: Document 삭제"
    type: http
    request:
      method: DELETE
      url: "{{PROJECT_URL}}/api/documents/wbhubmanager/test/{{DOC_SLUG}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200

  - name: "P1-CRUD-006: 삭제된 Document 조회 (404 확인)"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/documents/wbhubmanager/test/{{DOC_SLUG}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404

  # ===== 권한 검증 테스트 =====
  - name: "P1-AUTH-001: 인증 없이 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/documents"
    expect:
      status: 401

  - name: "P1-AUTH-002: 인증 없이 생성"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/documents"
      headers:
        Content-Type: "application/json"
      body:
        title: "Unauthorized Test"
    expect:
      status: 401

  # ===== 데이터 무결성 테스트 =====
  - name: "P1-VAL-001: 필수 필드 누락"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/documents"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        content: "제목 없는 문서"
    expect:
      status: 400
```

### 3.2 WBSalesHub용 P1 테스트

```yaml
# HWTestAgent/scenarios/wbsaleshub/core-api-p1.yaml
name: "WBSalesHub Core API P1 Test"
description: "핵심 기능 검증 - Customer CRUD, 관계 데이터, 권한"
type: CORE_API_P1
version: "2.0"

variables:
  PROJECT_URL: "https://wbsaleshub.up.railway.app"
  HUBMANAGER_URL: "https://wbhub.up.railway.app"
  TEST_EMAIL: "test-hwtest@wavebridge.kr"
  TEST_NAME: "HWTestAgent"
  TEST_CUSTOMER_NAME: "P1 테스트 고객"
  TEST_CUSTOMER_EMAIL: "p1-test@example.com"

schedule:
  cron: "0 8,20 * * *"
  on_deploy: true

timeout: 300000

notify_on:
  - failure
  - recovery

steps:
  # ===== 인증 토큰 발급 =====
  - name: "Setup: HubManager 토큰 발급"
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

  # ===== CRUD 테스트 =====
  - name: "P1-CRUD-001: Customer 생성"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/customers"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        name: "{{TEST_CUSTOMER_NAME}}"
        email: "{{TEST_CUSTOMER_EMAIL}}"
        phone: "010-1234-5678"
        company: "테스트 회사"
        status: "active"
    expect:
      status: 201
      json:
        success: true
    save:
      CUSTOMER_ID: "response.body.data.id"

  - name: "P1-CRUD-002: 생성된 Customer 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers/{{CUSTOMER_ID}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true
        data:
          name: "{{TEST_CUSTOMER_NAME}}"
          email: "{{TEST_CUSTOMER_EMAIL}}"

  - name: "P1-CRUD-003: Customer 수정"
    type: http
    request:
      method: PUT
      url: "{{PROJECT_URL}}/api/customers/{{CUSTOMER_ID}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        name: "{{TEST_CUSTOMER_NAME}} - 수정됨"
        status: "inactive"
    expect:
      status: 200
      json:
        success: true

  - name: "P1-CRUD-004: 수정된 Customer 확인"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers/{{CUSTOMER_ID}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        data:
          name: "{{TEST_CUSTOMER_NAME}} - 수정됨"
          status: "inactive"

  # ===== 관계 데이터 테스트 =====
  - name: "P1-REL-001: Customer의 Contact 목록 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers/{{CUSTOMER_ID}}/contacts"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true
        data: "@array"

  - name: "P1-REL-002: Customer에 Contact 생성"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/customers/{{CUSTOMER_ID}}/contacts"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        name: "담당자 테스트"
        email: "contact@example.com"
        phone: "010-9876-5432"
        position: "매니저"
    expect:
      status: 201
    save:
      CONTACT_ID: "response.body.data.id"

  # ===== 권한 검증 테스트 =====
  - name: "P1-AUTH-001: 인증 없이 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers"
    expect:
      status: 401

  - name: "P1-AUTH-002: 인증 없이 생성"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/customers"
      headers:
        Content-Type: "application/json"
      body:
        name: "Unauthorized Customer"
    expect:
      status: 401

  # ===== 데이터 무결성 테스트 =====
  - name: "P1-VAL-001: 필수 필드 누락 (이름 없음)"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/customers"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        email: "no-name@example.com"
    expect:
      status: 400

  - name: "P1-VAL-002: 잘못된 이메일 형식"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/customers"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        name: "Invalid Email Test"
        email: "not-an-email"
    expect:
      status: 400

  # ===== 정리: 테스트 데이터 삭제 =====
  - name: "Cleanup: Contact 삭제"
    type: http
    request:
      method: DELETE
      url: "{{PROJECT_URL}}/api/contacts/{{CONTACT_ID}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200

  - name: "P1-CRUD-005: Customer 삭제"
    type: http
    request:
      method: DELETE
      url: "{{PROJECT_URL}}/api/customers/{{CUSTOMER_ID}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200

  - name: "P1-CRUD-006: 삭제된 Customer 조회 (404 확인)"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/customers/{{CUSTOMER_ID}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404
```

### 3.3 WBFinHub용 P1 테스트

```yaml
# HWTestAgent/scenarios/wbfinhub/core-api-p1.yaml
name: "WBFinHub Core API P1 Test"
description: "핵심 기능 검증 - Account CRUD, Transaction, 권한"
type: CORE_API_P1
version: "2.0"

variables:
  PROJECT_URL: "https://wbfinhub.up.railway.app"
  HUBMANAGER_URL: "https://wbhub.up.railway.app"
  TEST_EMAIL: "test-hwtest@wavebridge.kr"
  TEST_NAME: "HWTestAgent"
  TEST_ACCOUNT_NAME: "P1 테스트 계정"

schedule:
  cron: "0 8,20 * * *"
  on_deploy: true

timeout: 300000

notify_on:
  - failure
  - recovery

steps:
  # ===== 인증 토큰 발급 =====
  - name: "Setup: HubManager 토큰 발급"
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

  # ===== CRUD 테스트 =====
  - name: "P1-CRUD-001: Account 생성"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/accounts"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        name: "{{TEST_ACCOUNT_NAME}}"
        type: "checking"
        currency: "KRW"
        balance: 0
        status: "active"
    expect:
      status: 201
      json:
        success: true
    save:
      ACCOUNT_ID: "response.body.data.id"

  - name: "P1-CRUD-002: 생성된 Account 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts/{{ACCOUNT_ID}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true
        data:
          name: "{{TEST_ACCOUNT_NAME}}"
          type: "checking"

  - name: "P1-CRUD-003: Account 수정"
    type: http
    request:
      method: PUT
      url: "{{PROJECT_URL}}/api/accounts/{{ACCOUNT_ID}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        name: "{{TEST_ACCOUNT_NAME}} - 수정됨"
        status: "inactive"
    expect:
      status: 200
      json:
        success: true

  - name: "P1-CRUD-004: 수정된 Account 확인"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts/{{ACCOUNT_ID}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        data:
          name: "{{TEST_ACCOUNT_NAME}} - 수정됨"

  # ===== 관계 데이터 테스트 =====
  - name: "P1-REL-001: Account의 Transaction 목록 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts/{{ACCOUNT_ID}}/transactions"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true
        data: "@array"

  - name: "P1-REL-002: Account에 Transaction 생성"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/transactions"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        account_id: "{{ACCOUNT_ID}}"
        type: "deposit"
        amount: 10000
        description: "P1 테스트 입금"
        currency: "KRW"
    expect:
      status: 201
    save:
      TRANSACTION_ID: "response.body.data.id"

  - name: "P1-REL-003: Account의 Wallet 목록 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts/{{ACCOUNT_ID}}/wallets"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  # ===== 권한 검증 테스트 =====
  - name: "P1-AUTH-001: 인증 없이 조회"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts"
    expect:
      status: 401

  - name: "P1-AUTH-002: 인증 없이 생성"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/accounts"
      headers:
        Content-Type: "application/json"
      body:
        name: "Unauthorized Account"
    expect:
      status: 401

  # ===== 데이터 무결성 테스트 =====
  - name: "P1-VAL-001: 필수 필드 누락 (이름 없음)"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/accounts"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        type: "checking"
    expect:
      status: 400

  - name: "P1-VAL-002: 잘못된 계정 타입"
    type: http
    request:
      method: POST
      url: "{{PROJECT_URL}}/api/accounts"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
        Content-Type: "application/json"
      body:
        name: "Invalid Type Test"
        type: "invalid_type"
    expect:
      status: 400

  # ===== 정리: 테스트 데이터 삭제 =====
  - name: "Cleanup: Transaction 삭제"
    type: http
    request:
      method: DELETE
      url: "{{PROJECT_URL}}/api/transactions/{{TRANSACTION_ID}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200

  - name: "P1-CRUD-005: Account 삭제"
    type: http
    request:
      method: DELETE
      url: "{{PROJECT_URL}}/api/accounts/{{ACCOUNT_ID}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 200

  - name: "P1-CRUD-006: 삭제된 Account 조회 (404 확인)"
    type: http
    request:
      method: GET
      url: "{{PROJECT_URL}}/api/accounts/{{ACCOUNT_ID}}"
      headers:
        Authorization: "Bearer {{ACCESS_TOKEN}}"
    expect:
      status: 404
```

---

## 4. 실행 조건

### 4.1 실행 주기
| 트리거 | 조건 | 우선순위 |
|-------|------|---------|
| 배포 전 | P0 테스트 통과 후 실행 | 높음 |
| 정기 실행 | 하루 2회 (8시, 20시) | 중간 |
| 기능 변경 시 | CRUD 관련 코드 변경 시 | 높음 |

### 4.2 타임아웃 설정
| 항목 | 값 | 설명 |
|-----|---|------|
| 전체 타임아웃 | 300초 (5분) | CRUD 전체 사이클 |
| 개별 요청 타임아웃 | 15초 | 일반 CRUD 요청 |
| 재시도 횟수 | 2회 | 네트워크 이슈 대응 |

### 4.3 실행 순서
```
Smoke Test (PASSED) → P0 Test (PASSED) → P1 Test → P2 Test
                                            ↑
                                        현재 위치
```

---

## 5. 성공/실패 기준

### 5.1 Pass 조건
- [ ] 모든 CRUD 테스트(P1-CRUD-001~006) 통과
- [ ] 모든 관계 데이터 테스트(P1-REL-001~003) 통과
- [ ] 모든 권한 검증 테스트(P1-AUTH-001~005) 통과
- [ ] 모든 데이터 무결성 테스트(P1-VAL-001~003) 통과
- [ ] 테스트 데이터 정상 정리 (Cleanup 완료)

### 5.2 Fail 조건
| 조건 | 심각도 | 조치 |
|-----|-------|------|
| CRUD 생성/수정/삭제 실패 | **High** | 배포 검토, DB 스키마 점검 |
| 권한 검증 실패 (401/403 미반환) | **High** | 보안 점검 필요 |
| 데이터 무결성 실패 | **High** | 유효성 검사 로직 점검 |
| 관계 데이터 조회 실패 | **Medium** | 관계 설정 점검 |

### 5.3 배포 차단 기준
```
P1 테스트 실패 시:
├── CRUD 테스트 1개 이상 실패 → 배포 검토 (강력 권고)
├── 권한 테스트 실패 → 배포 차단 (보안 이슈)
└── 데이터 무결성 실패 → 배포 검토
```

---

## 6. 기존 시나리오 대체 매핑

### 6.1 대체되는 기존 시나리오

| 기존 파일 | 신규 파일 | 대체 범위 |
|----------|----------|----------|
| `wbhubmanager/precision.yaml` | `wbhubmanager/core-api-p1.yaml` | 완전 대체 |
| `wbhubmanager/precision-*.yaml` | `wbhubmanager/core-api-p1-*.yaml` | 완전 대체 |
| `wbsaleshub/precision.yaml` | `wbsaleshub/core-api-p1.yaml` | 완전 대체 |
| `wbsaleshub/precision-*.yaml` | `wbsaleshub/core-api-p1-*.yaml` | 완전 대체 |
| `wbfinhub/precision.yaml` | `wbfinhub/core-api-p1.yaml` | 완전 대체 |
| `wbfinhub/precision-*.yaml` | `wbfinhub/core-api-p1-*.yaml` | 완전 대체 |

### 6.2 마이그레이션 체크리스트
- [ ] 기존 `precision.yaml` 백업
- [ ] 신규 `core-api-p1.yaml` 파일 생성
- [ ] 테스트 데이터 생성/삭제 로직 검증
- [ ] 환경별 변수 파일 생성
- [ ] 스케줄러 업데이트
- [ ] 테스트 실행 및 검증

---

**문서 버전:** 1.0
**작성:** Claude Code
**최종 수정:** 2026-01-02
