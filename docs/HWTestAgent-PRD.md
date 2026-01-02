# HWTestAgent PRD (Product Requirements Document)

**프로젝트명:** HWTestAgent (Hybrid WorkHub Test Agent)
**작성일:** 2026-01-01
**작성자:** Peter Chung (@peterchung0331)
**버전:** 1.0
**목적:** 멀티 WorkHub 프로젝트의 통합 테스트 자동화 시스템 (하이브리드 방식)

---

## 📋 Executive Summary

HWTestAgent는 WBHubManager, WBFinHub, WBSalesHub, WBOnboardingHub 등 여러 WorkHub 프로젝트를 24/7 자동으로 테스트하고 모니터링하는 하이브리드 테스트 플랫폼입니다.

**핵심 가치:**
- PC 독립적 24/7 테스트 실행 (GitHub Actions + Railway)
- 중앙 집중식 테스트 관리 및 히스토리 추적
- 실시간 Slack 알림으로 장애 조기 발견
- 간단한 웹 대시보드로 테스트 결과 시각화

---

## 🎯 프로젝트 목표

### 1차 목표 (Phase 1 - MVP)
- [ ] GitHub 리포지토리 생성 (`peterchung0331/HWTestAgent`)
- [ ] Railway 배포 및 24/7 운영 환경 구축
- [ ] WBHubManager 정밀 테스트 9개 항목 자동화
- [ ] **자동 수정 기능** (기본 활성화, 테스트 실패 시 자동으로 문제 수정 시도)
- [ ] **에러 패턴 학습 기능** (매일 실행, 3회 이상 반복 시 자동 시나리오 생성)
- [ ] Slack 알림 시스템 구축
- [ ] 간단한 웹 대시보드 (테스트 결과 조회)

### 2차 목표 (Phase 2)
- [ ] SSO 인증 테스트 7개 항목 추가
- [ ] WBFinHub 테스트 추가
- [ ] GitHub Actions 스케줄러 연동 (하이브리드)
- [ ] **시나리오 활용도 분석 및 자동 삭제** (주간 실행)
- [ ] 테스트 결과 기반 자동 개선 (타임아웃, 지연 조정)
- [ ] 테스트 히스토리 트렌드 분석

### 3차 목표 (Phase 3)
- [ ] 통합 테스트 (Cross-Hub SSO)
- [ ] WBSalesHub, WBOnboardingHub 테스트 추가
- [ ] 고급 대시보드 (차트, 알림 설정)

---

## 🏗️ 시스템 아키텍처

### 하이브리드 방식 (GitHub Actions + Railway)

```
┌──────────────────────────────────────────────────────────────┐
│                      GitHub Repository                       │
│              peterchung0331/HWTestAgent                      │
│                                                              │
│  ├── .github/workflows/                                      │
│  │   ├── scheduled-tests.yml    # cron: 0 6,18 * * *        │
│  │   └── on-demand-tests.yml    # workflow_dispatch         │
│  │                                                           │
│  ├── src/                                                    │
│  │   ├── server/               # Express API 서버           │
│  │   ├── runner/               # 테스트 실행 엔진           │
│  │   ├── storage/              # PostgreSQL 결과 저장       │
│  │   ├── notification/         # Slack 알림                │
│  │   └── frontend/             # Next.js 대시보드          │
│  │                                                           │
│  └── scenarios/                # YAML 테스트 시나리오       │
│      └── wbhubmanager/                                       │
│          └── precision.yaml    # 정밀 테스트 9개 항목       │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                     Railway Deployment                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  HWTestAgent Service (24/7 운영)                       │ │
│  │                                                         │ │
│  │  ├── Express API Server (:4100)                        │ │
│  │  │   └── POST /api/test/run                            │ │
│  │  │   └── GET  /api/test/results                        │ │
│  │  │                                                      │ │
│  │  ├── Test Runner Engine                                │ │
│  │  │   └── Playwright E2E Tests                          │ │
│  │  │   └── HTTP API Tests                                │ │
│  │  │                                                      │ │
│  │  ├── PostgreSQL Database                               │ │
│  │  │   └── Test Results History                          │ │
│  │  │                                                      │ │
│  │  ├── Slack Notifier                                    │ │
│  │  │   └── Webhook Integration                           │ │
│  │  │                                                      │ │
│  │  └── Next.js Dashboard                                 │ │
│  │      └── Test Results UI                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  테스트 대상:                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐      │
│  │WBHubManager │  │  WBFinHub   │  │ WBOnboardingHub │      │
│  │   :4090     │  │   :4020     │  │     :4030       │      │
│  └─────────────┘  └─────────────┘  └─────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

### 실행 플로우 (자동 수정 포함)

```
[GitHub Actions] (매일 06:00, 18:00)
        │
        ├─ 1. Trigger: POST /api/test/run (Railway)
        │      { "auto_fix": true }  ← 기본값 true
        │
        ▼
[Railway HWTestAgent]
        │
        ├─ 2. Load YAML Scenario (precision.yaml)
        ├─ 3. Run Tests (Playwright + HTTP)
        │
        ├─ 4. 테스트 실패 감지?
        │      │
        │      ├─ YES → Auto-Fix 활성화?
        │      │         │
        │      │         ├─ YES → 5-1. 문제 분석 & 자동 수정
        │      │         │         └─→ 5-2. 재테스트 (최대 3회)
        │      │         │                └─→ 성공 시: 6. Save Results
        │      │         │                └─→ 실패 시: 7. Save + Notify
        │      │         │
        │      │         └─ NO  → 7. Save + Notify (수정 없이)
        │      │
        │      └─ NO  → 6. Save Results (PostgreSQL)
        │
        ├─ 8. Send Notification (Slack)
        │      - 성공: "✅ 9/9 Passed"
        │      - 자동수정: "🔧 7/9 → 9/9 (2개 자동 수정)"
        │      - 실패: "❌ 7/9 Failed (수정 불가)"
        │
        ▼
[Slack Channel]
```

---

## 📦 기술 스택

### Backend
- **Runtime:** Node.js 20 + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (Railway 제공)
- **Test Framework:** Playwright (E2E), axios (HTTP API)
- **Scheduler:** node-cron (백업용)

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS (추후)
- **Charts:** Recharts (Phase 2)

### DevOps
- **Hosting:** Railway
- **CI/CD:** GitHub Actions
- **Environment:** Doppler (선택 사항, 환경 변수 관리)
- **Notifications:** Slack Webhook

---

## 📂 프로젝트 구조

```
HWTestAgent/
├── .github/
│   └── workflows/
│       ├── scheduled-tests.yml      # 매일 06:00, 18:00 테스트 실행
│       └── on-demand-tests.yml      # 수동 트리거
│
├── src/
│   ├── server/
│   │   ├── index.ts                 # Express 메인 서버
│   │   ├── routes/
│   │   │   ├── api.ts               # API 라우트
│   │   │   ├── webhook.ts           # GitHub Actions 웹훅
│   │   │   └── insights.ts          # 시나리오 인사이트 API
│   │   └── middleware/
│   │       └── auth.ts              # 간단한 API 키 인증
│   │
│   ├── runner/
│   │   ├── TestRunner.ts            # 테스트 실행 메인 클래스
│   │   ├── AutoFixer.ts             # 자동 수정 엔진
│   │   ├── ScenarioLearner.ts       # 에러 패턴 학습 및 시나리오 생성
│   │   ├── scenarios/
│   │   │   ├── ScenarioLoader.ts    # YAML 파싱
│   │   │   └── ScenarioRunner.ts    # 시나리오 순차 실행
│   │   └── adapters/
│   │       ├── HttpAdapter.ts       # HTTP API 테스트 어댑터
│   │       └── PlaywrightAdapter.ts # Playwright E2E 어댑터
│   │
│   ├── analyzer/
│   │   ├── TestAnalyzer.ts          # 테스트 결과 트렌드 분석
│   │   └── ScenarioUtilityAnalyzer.ts # 시나리오 활용도 분석
│   │
│   ├── jobs/
│   │   ├── ScenarioMaintenanceJob.ts # 주간 시나리오 유지보수
│   │   └── ErrorPatternLearningJob.ts # 매일 에러 패턴 학습
│   │
│   ├── storage/
│   │   ├── db.ts                    # PostgreSQL 연결
│   │   ├── models/
│   │   │   ├── TestRun.ts           # 테스트 실행 기록 모델
│   │   │   ├── TestStep.ts          # 개별 테스트 스텝 모델
│   │   │   ├── ErrorPattern.ts      # 에러 패턴 모델
│   │   │   └── ScenarioMetric.ts    # 시나리오 활용도 메트릭 모델
│   │   └── repositories/
│   │       ├── TestRepository.ts    # 테스트 결과 CRUD
│   │       ├── ScenarioRepository.ts # 시나리오 CRUD
│   │       └── ErrorPatternRepository.ts # 에러 패턴 CRUD
│   │
│   ├── notification/
│   │   └── SlackNotifier.ts         # Slack 웹훅 전송
│   │
│   └── frontend/
│       └── app/
│           ├── page.tsx              # 메인 대시보드
│           ├── api/
│           │   └── results/
│           │       └── route.ts      # API 라우트
│           └── components/
│               └── TestResultCard.tsx
│
├── scenarios/                        # 테스트 시나리오 (YAML)
│   ├── wbhubmanager/
│   │   ├── precision.yaml            # 정밀 테스트 9개 항목
│   │   └── auto-generated/           # 자동 생성된 시나리오
│   └── archive/                      # 삭제된 시나리오 백업
│
├── tests/                            # 참고용 기존 테스트 (복사)
│   ├── e2e/
│   │   ├── api.spec.ts
│   │   └── auth.spec.ts
│   └── utils/
│
├── prisma/                           # Phase 2 (선택)
│   └── schema.prisma
│
├── config/
│   └── learning.yaml                 # 자가 학습 설정
│
├── package.json
├── tsconfig.json
├── Dockerfile
├── railway.toml                      # Railway 배포 설정
└── README.md
```

---

## 🧪 테스트 시나리오 정의

### Phase 1: WBHubManager 정밀 테스트 (9개 항목)

기존 `tests/e2e/api.spec.ts`와 `auth.spec.ts`를 참고하여 YAML 형식으로 변환

```yaml
# scenarios/wbhubmanager/precision.yaml
name: "WBHubManager 정밀 테스트"
slug: "precision"
description: "Railway 배포 전 필수 검증 테스트"
type: PRECISION
environment: production
schedule: "0 6,18 * * *"  # 매일 06:00, 18:00
timeout: 300000  # 5분
notify_on:
  - failure
  - recovery

variables:
  TARGET_URL: "https://wbhub.up.railway.app"

steps:
  # API-01: Health Check
  - name: "Test 1: Health Check"
    type: http
    method: GET
    url: "{{TARGET_URL}}/api/health"
    expect:
      status: 200
      json:
        success: true
    timeout: 10000

  # API-02: Hubs 목록 조회
  - name: "Test 2: GET /api/hubs"
    type: http
    method: GET
    url: "{{TARGET_URL}}/api/hubs"
    expect:
      status: 200
      json:
        success: true
        data: "@array"

  # API-04: JWT Public Key 조회
  - name: "Test 3: JWT Public Key"
    type: http
    method: GET
    url: "{{TARGET_URL}}/api/auth/public-key"
    expect:
      status: 200
      json:
        success: true
        data:
          algorithm: "RS256"

  # A-01: JWT 토큰 발급
  - name: "Test 4: JWT Token 발급"
    type: http
    method: POST
    url: "{{TARGET_URL}}/api/auth/google-login"
    body:
      email: "test-hwtest@wavebridge.kr"
      name: "HWTestAgent"
    expect:
      status: 200
      json:
        success: true
    save:
      ACCESS_TOKEN: "$.data.accessToken"
      REFRESH_TOKEN: "$.data.refreshToken"

  # A-02: Access Token 검증
  - name: "Test 5: Token 검증"
    type: http
    method: POST
    url: "{{TARGET_URL}}/api/auth/verify"
    body:
      token: "{{ACCESS_TOKEN}}"
    expect:
      status: 200
      json:
        success: true
        data:
          valid: true

  # A-03: Token Refresh
  - name: "Test 6: Token 갱신"
    type: http
    method: POST
    url: "{{TARGET_URL}}/api/auth/refresh"
    body:
      refreshToken: "{{REFRESH_TOKEN}}"
    expect:
      status: 200
      json:
        success: true

  # A-04: Logout
  - name: "Test 7: Logout"
    type: http
    method: POST
    url: "{{TARGET_URL}}/api/auth/jwt-logout"
    body:
      refreshToken: "{{REFRESH_TOKEN}}"
    expect:
      status: 200

  # S-01: 알고리즘 혼동 공격 방어
  - name: "Test 8: 보안 - none 알고리즘 거부"
    type: http
    method: POST
    url: "{{TARGET_URL}}/api/auth/verify"
    body:
      token: "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxIn0."
    expect:
      status: 401

  # API-05: Frontend 접근 테스트
  - name: "Test 9: Frontend Route"
    type: http
    method: GET
    url: "{{TARGET_URL}}/"
    expect:
      status: 200
      body_contains: "<!DOCTYPE html>"
```

---

## 💾 데이터베이스 스키마 (단순화된 버전)

Phase 1에서는 Prisma 없이 직접 SQL로 구현 (빠른 MVP)

```sql
-- Test Runs Table
CREATE TABLE test_runs (
  id SERIAL PRIMARY KEY,
  project_name VARCHAR(100) NOT NULL,  -- 'WBHubManager'
  scenario_slug VARCHAR(100) NOT NULL,  -- 'precision'
  status VARCHAR(20) NOT NULL,          -- 'PENDING', 'RUNNING', 'PASSED', 'FAILED'
  environment VARCHAR(20) NOT NULL,     -- 'production', 'staging', 'local'
  triggered_by VARCHAR(20) NOT NULL,    -- 'schedule', 'manual', 'webhook'
  started_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP,
  duration_ms INTEGER,
  total_steps INTEGER,
  passed_steps INTEGER,
  failed_steps INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Test Steps Table
CREATE TABLE test_steps (
  id SERIAL PRIMARY KEY,
  test_run_id INTEGER REFERENCES test_runs(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  step_order INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,         -- 'PASSED', 'FAILED', 'SKIPPED'
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  duration_ms INTEGER,
  error_message TEXT,
  response_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_test_runs_project ON test_runs(project_name, scenario_slug);
CREATE INDEX idx_test_runs_created ON test_runs(created_at DESC);
CREATE INDEX idx_test_steps_run ON test_steps(test_run_id);
```

---

## 🔔 Slack 알림 형식

### 성공 시

```
✅ WBHubManager 정밀 테스트 완료

📦 프로젝트: WBHubManager
🎯 시나리오: precision (정밀 테스트)
📊 결과: 9/9 통과 (100%)
⏱️ 소요 시간: 2m 14s
🕐 실행 시각: 2026-01-01 06:00:00 KST

🔗 대시보드: https://hwtest.up.railway.app/results/123
```

### 실패 시

```
❌ WBHubManager 정밀 테스트 실패

📦 프로젝트: WBHubManager
🎯 시나리오: precision (정밀 테스트)
📊 결과: 7/9 통과 (77.8%)
⏱️ 소요 시간: 1m 42s
🕐 실행 시각: 2026-01-01 06:00:00 KST

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
실패한 테스트:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Test 4: JWT Token 발급
   • Expected: status 200
   • Actual: status 500
   • Error: Database connection failed

❌ Test 5: Token 검증
   • Skipped (의존성 실패)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 가능한 원인:
1. PostgreSQL 연결 문제
2. Railway 환경 변수 누락
3. 최근 배포 변경사항 확인 필요

🔗 상세 로그: https://hwtest.up.railway.app/results/124
```

---

## 🚀 Phase 1 구현 계획 (MVP)

### Step 1: 프로젝트 초기화 (1일차)
```bash
# GitHub 리포지토리 생성
gh repo create peterchung0331/HWTestAgent --public

# 프로젝트 구조 생성
mkdir -p HWTestAgent/src/{server,runner,storage,notification,frontend}
mkdir -p HWTestAgent/scenarios/wbhubmanager
mkdir -p HWTestAgent/.github/workflows

# 패키지 초기화
npm init -y
npm install express typescript @types/node @types/express
npm install axios js-yaml dotenv pg
npm install -D tsx nodemon @types/pg
```

### Step 2: 핵심 기능 구현 (2-3일차)

#### 파일 우선순위:
1. `src/server/index.ts` - Express API 서버
2. `src/runner/TestRunner.ts` - 테스트 실행 엔진 (자동 수정 로직 포함)
3. `src/runner/adapters/HttpAdapter.ts` - HTTP 테스트
4. `src/runner/AutoFixer.ts` - 자동 수정 엔진
5. `src/runner/ScenarioLearner.ts` - 에러 패턴 학습 엔진 (Phase 1)
6. `src/storage/db.ts` - PostgreSQL 연결
7. `src/notification/SlackNotifier.ts` - Slack 알림
8. `scenarios/wbhubmanager/precision.yaml` - 정밀 테스트 시나리오
9. `src/jobs/ErrorPatternLearningJob.ts` - 매일 에러 학습 (Phase 1)

### Step 3: Railway 배포 (4일차)
```bash
# Railway CLI 설치
npm install -g @railway/cli

# Railway 프로젝트 생성
railway init
railway add --database postgres

# 환경 변수 설정
railway variables set SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
railway variables set NODE_ENV="production"

# 배포
railway up
```

### Step 4: GitHub Actions 연동 (5일차)

#### `.github/workflows/scheduled-tests.yml`
```yaml
name: Scheduled Tests

on:
  schedule:
    - cron: '0 6,18 * * *'  # 매일 06:00, 18:00 (UTC)
  workflow_dispatch:         # 수동 실행 지원

jobs:
  trigger-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger HWTestAgent
        run: |
          curl -X POST ${{ secrets.HWTEST_API_URL }}/api/test/run \
            -H "Authorization: Bearer ${{ secrets.HWTEST_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{
              "project": "WBHubManager",
              "scenario": "precision",
              "environment": "production",
              "triggered_by": "schedule"
            }'
```

### Step 5: 간단한 대시보드 (6일차)

최소 기능:
- 최근 테스트 결과 목록 (10개)
- 개별 테스트 실행 상세 조회
- 수동 테스트 실행 버튼

---

## 📊 API 엔드포인트 설계

### POST `/api/test/run`
테스트 실행 요청

**Request:**
```json
{
  "project": "WBHubManager",
  "scenario": "precision",
  "environment": "production",
  "triggered_by": "schedule",
  "auto_fix": true,              // ← NEW: 기본값 true (자동 수정 활성화)
  "max_retry": 3                 // ← NEW: 자동 수정 후 재시도 횟수 (기본 3)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "test_run_id": 123,
    "status": "RUNNING",
    "auto_fix_enabled": true,
    "started_at": "2026-01-01T06:00:00Z"
  }
}
```

### GET `/api/test/results`
테스트 결과 조회

**Query Params:**
- `limit`: 조회할 개수 (기본: 10)
- `project`: 프로젝트 필터 (선택)
- `status`: 상태 필터 (선택)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "project_name": "WBHubManager",
      "scenario_slug": "precision",
      "status": "PASSED",
      "total_steps": 9,
      "passed_steps": 9,
      "failed_steps": 0,
      "duration_ms": 134000,
      "started_at": "2026-01-01T06:00:00Z",
      "finished_at": "2026-01-01T06:02:14Z"
    }
  ]
}
```

### GET `/api/test/results/:id`
특정 테스트 실행 상세 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "project_name": "WBHubManager",
    "scenario_slug": "precision",
    "status": "PASSED",
    "auto_fix_enabled": true,
    "auto_fixed_count": 2,        // ← NEW: 자동 수정된 테스트 개수
    "retry_count": 1,              // ← NEW: 재시도 횟수
    "steps": [
      {
        "name": "Test 1: Health Check",
        "status": "PASSED",
        "duration_ms": 1200,
        "auto_fixed": false,
        "response_data": {
          "status": 200,
          "body": { "success": true }
        }
      },
      {
        "name": "Test 4: JWT Token 발급",
        "status": "PASSED",
        "duration_ms": 2400,
        "auto_fixed": true,         // ← NEW: 자동 수정됨
        "fix_description": "환경 변수 GOOGLE_CLIENT_ID 누락 감지 → Railway 환경 변수 자동 설정",
        "response_data": {
          "status": 200,
          "body": { "success": true }
        }
      }
    ]
  }
}
```

---

## 🔧 자동 수정 기능 (Auto-Fix)

### 개요
HWTestAgent의 핵심 기능으로, 테스트 실패 시 문제를 자동으로 분석하고 수정을 시도합니다.

### 기본 동작
- **기본값:** `auto_fix: true` (자동 수정 활성화)
- **비활성화 옵션:** API 요청 시 `auto_fix: false` 전달
- **최대 재시도:** 3회 (설정 가능)

### 자동 수정 가능한 문제 유형

#### 1. 환경 변수 누락
**문제:**
```
❌ Test 4: JWT Token 발급
   Error: "GOOGLE_CLIENT_ID is not defined"
```

**자동 수정:**
```typescript
// AutoFixer.ts
async fixMissingEnvVar(error: TestError) {
  // 1. Railway API를 통해 환경 변수 확인
  const railwayEnv = await getRailwayEnvVars(projectId);

  // 2. 누락된 변수 감지
  if (!railwayEnv.includes('GOOGLE_CLIENT_ID')) {
    // 3. Doppler 또는 백업 소스에서 값 조회
    const value = await getDopplerSecret('GOOGLE_CLIENT_ID');

    // 4. Railway 환경 변수 자동 설정
    await setRailwayEnvVar(projectId, 'GOOGLE_CLIENT_ID', value);

    // 5. 서비스 재시작 대기 (30초)
    await wait(30000);

    return { fixed: true, description: '환경 변수 자동 설정 완료' };
  }
}
```

#### 2. 서비스 다운/타임아웃
**문제:**
```
❌ Test 1: Health Check
   Error: "ECONNREFUSED: Connection refused (timeout after 10s)"
```

**자동 수정:**
```typescript
async fixServiceDown(error: TestError) {
  // 1. Railway 서비스 상태 확인
  const status = await getRailwayServiceStatus(projectId);

  if (status === 'crashed' || status === 'stopped') {
    // 2. 서비스 재시작
    await restartRailwayService(projectId);

    // 3. Health Check 대기 (최대 60초)
    await waitForHealthCheck(targetUrl, 60000);

    return { fixed: true, description: 'Railway 서비스 자동 재시작' };
  }

  // 4. 타임아웃만 발생한 경우 - 재시도
  return { fixed: false, retry: true };
}
```

#### 3. 데이터베이스 연결 실패
**문제:**
```
❌ Test 2: GET /api/hubs
   Error: "Database connection failed: too many clients"
```

**자동 수정:**
```typescript
async fixDatabaseIssue(error: TestError) {
  // 1. Railway PostgreSQL 상태 확인
  const dbStatus = await getRailwayDatabaseStatus(projectId);

  if (dbStatus.connection_count >= dbStatus.max_connections) {
    // 2. Connection pool 초기화 API 호출
    await fetch(`${targetUrl}/api/admin/reset-pool`, {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken }
    });

    await wait(5000);

    return { fixed: true, description: 'DB Connection Pool 리셋' };
  }
}
```

#### 4. Rate Limiting 해제
**문제:**
```
❌ Test 6: Token 갱신
   Status: 429 Too Many Requests
```

**자동 수정:**
```typescript
async fixRateLimiting(error: TestError) {
  // 1. Redis/메모리 캐시 플러시 API 호출
  await fetch(`${targetUrl}/api/admin/clear-rate-limit`, {
    method: 'POST',
    headers: { 'X-Admin-Token': adminToken },
    body: JSON.stringify({ ip: 'hwtest-agent' })
  });

  await wait(2000);

  return { fixed: true, description: 'Rate Limit 초기화' };
}
```

#### 5. JWT 키 불일치
**문제:**
```
❌ Test 3: JWT Public Key
   Error: "Public key mismatch or invalid format"
```

**자동 수정:**
```typescript
async fixJWTKeyMismatch(error: TestError) {
  // 1. Doppler에서 최신 JWT 키 조회
  const jwtKeys = await getDopplerSecrets(['JWT_PUBLIC_KEY', 'JWT_PRIVATE_KEY']);

  // 2. Railway 환경 변수 업데이트
  await setRailwayEnvVars(projectId, jwtKeys);

  // 3. 서비스 재배포 (키 변경 시 필수)
  await triggerRailwayDeploy(projectId);

  // 4. 배포 완료 대기 (최대 3분)
  await waitForDeployment(projectId, 180000);

  return { fixed: true, description: 'JWT 키 동기화 및 재배포' };
}
```

### AutoFixer 구현 예시

```typescript
// src/runner/AutoFixer.ts

export class AutoFixer {
  private maxRetries: number = 3;
  private fixHistory: FixRecord[] = [];

  constructor(
    private railwayClient: RailwayClient,
    private dopplerClient: DopplerClient
  ) {}

  async attemptFix(
    testStep: TestStep,
    error: TestError,
    retryCount: number
  ): Promise<FixResult> {

    // 재시도 횟수 초과
    if (retryCount >= this.maxRetries) {
      return {
        fixed: false,
        reason: 'Max retry attempts exceeded',
        description: `Failed after ${this.maxRetries} attempts`
      };
    }

    // 에러 유형 분석
    const errorType = this.analyzeError(error);

    // 수정 전략 선택
    let fixResult: FixResult;

    switch (errorType) {
      case 'ENV_VAR_MISSING':
        fixResult = await this.fixMissingEnvVar(error);
        break;

      case 'SERVICE_DOWN':
        fixResult = await this.fixServiceDown(error);
        break;

      case 'DATABASE_ERROR':
        fixResult = await this.fixDatabaseIssue(error);
        break;

      case 'RATE_LIMIT':
        fixResult = await this.fixRateLimiting(error);
        break;

      case 'JWT_KEY_MISMATCH':
        fixResult = await this.fixJWTKeyMismatch(error);
        break;

      default:
        fixResult = {
          fixed: false,
          reason: 'Unknown error type',
          retry: true  // 알 수 없는 에러는 재시도만
        };
    }

    // 수정 이력 저장
    this.fixHistory.push({
      testStep: testStep.name,
      errorType,
      fixResult,
      timestamp: new Date()
    });

    return fixResult;
  }

  private analyzeError(error: TestError): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('not defined') || message.includes('missing')) {
      return 'ENV_VAR_MISSING';
    }
    if (message.includes('econnrefused') || message.includes('timeout')) {
      return 'SERVICE_DOWN';
    }
    if (message.includes('database') || message.includes('too many clients')) {
      return 'DATABASE_ERROR';
    }
    if (error.status === 429) {
      return 'RATE_LIMIT';
    }
    if (message.includes('jwt') || message.includes('public key')) {
      return 'JWT_KEY_MISMATCH';
    }

    return 'UNKNOWN';
  }
}
```

### TestRunner 통합

```typescript
// src/runner/TestRunner.ts

export class TestRunner {
  private autoFixer: AutoFixer;

  async runScenario(
    scenario: Scenario,
    options: RunOptions
  ): Promise<TestRunResult> {

    const results: TestStepResult[] = [];
    let autoFixedCount = 0;
    let retryCount = 0;

    for (const step of scenario.steps) {
      let stepResult = await this.executeStep(step);

      // 실패 시 자동 수정 시도
      if (stepResult.status === 'FAILED' && options.auto_fix) {
        console.log(`🔧 Attempting auto-fix for: ${step.name}`);

        const fixResult = await this.autoFixer.attemptFix(
          step,
          stepResult.error,
          retryCount
        );

        if (fixResult.fixed) {
          // 수정 성공 → 재테스트
          console.log(`✅ Fix applied: ${fixResult.description}`);
          await this.wait(5000);  // 5초 대기 후 재시도

          stepResult = await this.executeStep(step);
          stepResult.auto_fixed = true;
          stepResult.fix_description = fixResult.description;

          if (stepResult.status === 'PASSED') {
            autoFixedCount++;
          }

          retryCount++;
        } else if (fixResult.retry) {
          // 재시도만 (수정 없이)
          console.log(`🔄 Retrying without fix...`);
          await this.wait(3000);

          stepResult = await this.executeStep(step);
          retryCount++;
        }
      }

      results.push(stepResult);

      // 연속 실패 시 중단 (선택 사항)
      if (stepResult.status === 'FAILED' && options.stop_on_failure) {
        break;
      }
    }

    return {
      results,
      auto_fixed_count: autoFixedCount,
      retry_count: retryCount
    };
  }
}
```

### 자동 수정 비활성화 예시

#### GitHub Actions에서 수동 테스트 시
```yaml
# .github/workflows/on-demand-tests.yml
name: Manual Tests (No Auto-Fix)

on:
  workflow_dispatch:
    inputs:
      auto_fix:
        description: 'Enable auto-fix'
        required: false
        default: 'false'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run tests without auto-fix
        run: |
          curl -X POST ${{ secrets.HWTEST_API_URL }}/api/test/run \
            -H "Authorization: Bearer ${{ secrets.HWTEST_API_KEY }}" \
            -d '{
              "project": "WBHubManager",
              "scenario": "precision",
              "auto_fix": ${{ github.event.inputs.auto_fix }},
              "triggered_by": "manual"
            }'
```

#### API 직접 호출 시
```bash
# 자동 수정 비활성화
curl -X POST https://hwtest.up.railway.app/api/test/run \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "project": "WBHubManager",
    "scenario": "precision",
    "auto_fix": false
  }'
```

### Slack 알림 (자동 수정 포함)

```
🔧 WBHubManager 정밀 테스트 완료 (자동 수정 적용)

📦 프로젝트: WBHubManager
🎯 시나리오: precision (정밀 테스트)
📊 결과: 9/9 통과 (100%)
🔧 자동 수정: 2개 테스트 자동 복구
🔄 재시도: 1회
⏱️ 소요 시간: 3m 42s
🕐 실행 시각: 2026-01-01 06:00:00 KST

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
자동 수정된 테스트:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 Test 4: JWT Token 발급
   • 문제: 환경 변수 GOOGLE_CLIENT_ID 누락
   • 수정: Railway 환경 변수 자동 설정
   • 결과: ✅ 성공

🔧 Test 5: Token 검증
   • 문제: Rate Limit (429)
   • 수정: Rate Limit 초기화
   • 결과: ✅ 성공

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 상세 로그: https://hwtest.up.railway.app/results/123
```

### 데이터베이스 스키마 업데이트

```sql
-- Test Steps에 자동 수정 정보 추가
ALTER TABLE test_steps ADD COLUMN auto_fixed BOOLEAN DEFAULT FALSE;
ALTER TABLE test_steps ADD COLUMN fix_description TEXT;
ALTER TABLE test_steps ADD COLUMN retry_attempt INTEGER DEFAULT 0;

-- Test Runs에 자동 수정 통계 추가
ALTER TABLE test_runs ADD COLUMN auto_fix_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE test_runs ADD COLUMN auto_fixed_count INTEGER DEFAULT 0;
ALTER TABLE test_runs ADD COLUMN retry_count INTEGER DEFAULT 0;
```

---

## 🧠 자가 학습 및 시나리오 관리 (Self-Learning)

### 개요
HWTestAgent는 테스트 실행 결과를 지속적으로 분석하여 새로운 에러 패턴을 학습하고, 테스트 시나리오를 자동으로 개선합니다.

### 핵심 기능

#### 1. 새로운 에러 패턴 자동 감지 및 시나리오 생성

**동작 방식:**
```typescript
// src/runner/ScenarioLearner.ts

export class ScenarioLearner {
  async analyzeTestResults(testRun: TestRun): Promise<LearningResult> {
    const insights = {
      newErrorPatterns: [],
      scenarioImprovements: [],
      redundantTests: []
    };

    // 1. 새로운 에러 패턴 분석
    for (const step of testRun.steps) {
      if (step.status === 'FAILED') {
        const errorPattern = await this.extractErrorPattern(step);

        // 기존 시나리오에 없는 새로운 에러인지 확인
        if (!await this.existsInScenarios(errorPattern)) {
          insights.newErrorPatterns.push({
            error: errorPattern,
            frequency: 1,
            firstSeen: new Date(),
            suggestedTest: await this.generateTestCase(errorPattern)
          });
        }
      }
    }

    // 2. 패턴이 3회 이상 반복되면 자동으로 시나리오 추가
    const frequentErrors = await this.getFrequentErrors(3);
    for (const error of frequentErrors) {
      await this.addTestScenario(error);
    }

    return insights;
  }

  private async generateTestCase(errorPattern: ErrorPattern): Promise<TestCase> {
    // AI/휴리스틱 기반 테스트 케이스 생성
    return {
      name: `Test: ${errorPattern.category} - ${errorPattern.summary}`,
      type: 'http',
      description: `자동 생성: ${errorPattern.description}`,
      steps: [
        {
          name: errorPattern.summary,
          url: errorPattern.endpoint,
          method: errorPattern.method,
          expect: {
            status: errorPattern.expectedStatus,
            // 에러가 재발하지 않는지 확인
            not: {
              error: errorPattern.errorMessage
            }
          }
        }
      ],
      autoGenerated: true,
      generatedAt: new Date(),
      confidence: errorPattern.confidence
    };
  }
}
```

#### 2. 테스트 결과 분석 및 자동 개선

**개선 사항 도출:**
```typescript
// src/analyzer/TestAnalyzer.ts

export class TestAnalyzer {
  async analyzeTestTrends(
    projectName: string,
    days: number = 30
  ): Promise<AnalysisReport> {

    // 1. 최근 30일간 테스트 결과 조회
    const runs = await this.db.getTestRuns(projectName, days);

    // 2. 각 테스트 단계별 성공률 분석
    const stepAnalysis = await this.analyzeStepPerformance(runs);

    // 3. 개선 사항 도출
    const improvements = [];

    for (const [stepName, metrics] of stepAnalysis) {
      // 성공률이 낮은 테스트 (< 90%)
      if (metrics.successRate < 0.9) {
        improvements.push({
          type: 'FLAKY_TEST',
          step: stepName,
          issue: `낮은 성공률: ${(metrics.successRate * 100).toFixed(1)}%`,
          suggestion: this.suggestFix(metrics),
          priority: 'HIGH'
        });
      }

      // 응답 시간이 느린 테스트
      if (metrics.avgDuration > 10000) {
        improvements.push({
          type: 'SLOW_TEST',
          step: stepName,
          issue: `평균 ${metrics.avgDuration}ms 소요`,
          suggestion: {
            action: 'INCREASE_TIMEOUT',
            currentTimeout: metrics.currentTimeout,
            suggestedTimeout: metrics.avgDuration * 1.5
          },
          priority: 'MEDIUM'
        });
      }

      // 항상 성공하는 테스트 (불필요할 수 있음)
      if (metrics.successRate === 1.0 && metrics.executionCount > 100) {
        improvements.push({
          type: 'REDUNDANT_TEST',
          step: stepName,
          issue: `${metrics.executionCount}회 연속 성공`,
          suggestion: {
            action: 'CONSIDER_REMOVAL',
            reason: '항상 성공하여 가치가 낮을 수 있음'
          },
          priority: 'LOW'
        });
      }
    }

    return { improvements, metrics: stepAnalysis };
  }

  private suggestFix(metrics: StepMetrics): Suggestion {
    // 실패 원인 분석
    const commonErrors = this.getCommonErrors(metrics.failures);

    if (commonErrors[0]?.includes('timeout')) {
      return {
        action: 'INCREASE_TIMEOUT',
        currentTimeout: metrics.currentTimeout,
        suggestedTimeout: metrics.avgDuration * 2
      };
    }

    if (commonErrors[0]?.includes('rate limit')) {
      return {
        action: 'ADD_DELAY',
        suggestedDelay: 5000,
        reason: 'Rate limit 회피'
      };
    }

    return {
      action: 'MANUAL_REVIEW',
      reason: '자동 분석 불가, 수동 검토 필요'
    };
  }
}
```

#### 3. 시나리오 활용도 분석 및 자동 삭제

**활용도 메트릭:**
```typescript
// src/analyzer/ScenarioUtilityAnalyzer.ts

export class ScenarioUtilityAnalyzer {
  async analyzeScenarioUtility(
    scenario: Scenario,
    period: number = 90 // 90일
  ): Promise<UtilityScore> {

    const runs = await this.db.getTestRunsByScenario(scenario.id, period);

    // 1. 실행 빈도
    const executionFrequency = runs.length / period;

    // 2. 실패 감지율 (얼마나 자주 문제를 발견하는가)
    const failureDetectionRate =
      runs.filter(r => r.status === 'FAILED').length / runs.length;

    // 3. 가치 점수 계산
    const utilityScore = this.calculateUtilityScore({
      executionFrequency,
      failureDetectionRate,
      autoGenerated: scenario.autoGenerated,
      lastFailure: this.getLastFailure(runs),
      confidence: scenario.confidence || 1.0
    });

    return {
      score: utilityScore,
      metrics: {
        executionCount: runs.length,
        executionFrequency,
        failureDetectionRate,
        lastExecuted: runs[0]?.started_at,
        lastFailure: this.getLastFailure(runs)
      },
      recommendation: this.getRecommendation(utilityScore, scenario)
    };
  }

  private calculateUtilityScore(factors: UtilityFactors): number {
    // 가중치 적용 점수 계산
    const weights = {
      executionFrequency: 0.2,    // 실행 빈도
      failureDetection: 0.5,       // 실패 감지율 (가장 중요)
      recency: 0.2,                // 최근성
      confidence: 0.1              // 신뢰도
    };

    // 실행 빈도 점수 (0-1)
    const freqScore = Math.min(factors.executionFrequency / 30, 1);

    // 실패 감지 점수 (0-1)
    // 5-10% 실패율이 이상적 (너무 높으면 flaky, 너무 낮으면 불필요)
    const detectionScore = factors.failureDetectionRate >= 0.05 &&
                          factors.failureDetectionRate <= 0.10
                          ? 1.0
                          : factors.failureDetectionRate * 2;

    // 최근성 점수 (0-1)
    const daysSinceLastFailure = factors.lastFailure
      ? (Date.now() - factors.lastFailure.getTime()) / (1000 * 60 * 60 * 24)
      : 365;
    const recencyScore = Math.max(0, 1 - daysSinceLastFailure / 90);

    // 최종 점수
    return (
      freqScore * weights.executionFrequency +
      detectionScore * weights.failureDetection +
      recencyScore * weights.recency +
      factors.confidence * weights.confidence
    ) * 100;
  }

  private getRecommendation(
    score: number,
    scenario: Scenario
  ): Recommendation {
    if (score < 20) {
      return {
        action: 'DELETE',
        reason: '활용도가 매우 낮음 (3개월간 문제 미발견)',
        autoApply: scenario.autoGenerated // 자동생성된 것만 자동 삭제
      };
    }

    if (score < 40) {
      return {
        action: 'ARCHIVE',
        reason: '활용도가 낮음 (필요시 복원 가능)',
        autoApply: false
      };
    }

    if (score < 60) {
      return {
        action: 'REVIEW',
        reason: '중간 활용도 (개선 검토 필요)',
        autoApply: false
      };
    }

    return {
      action: 'KEEP',
      reason: '활용도 높음',
      autoApply: false
    };
  }
}
```

#### 4. 자동 시나리오 관리 워크플로우

```typescript
// src/jobs/ScenarioMaintenanceJob.ts

export class ScenarioMaintenanceJob {
  // 매주 일요일 자정 실행
  @Scheduled('0 0 * * 0')
  async runWeeklyMaintenance() {
    console.log('🔧 Starting weekly scenario maintenance...');

    const report = {
      analyzed: 0,
      added: 0,
      improved: 0,
      archived: 0,
      deleted: 0
    };

    // 1. 모든 프로젝트의 시나리오 분석
    const projects = await this.db.getProjects();

    for (const project of projects) {
      const scenarios = await this.db.getScenarios(project.id);

      for (const scenario of scenarios) {
        report.analyzed++;

        // 활용도 분석
        const utility = await this.utilityAnalyzer.analyzeScenarioUtility(
          scenario,
          90 // 최근 90일
        );

        // 2. 활용도 기반 액션
        if (utility.recommendation.action === 'DELETE' &&
            utility.recommendation.autoApply) {

          await this.deleteScenario(scenario, utility);
          report.deleted++;

        } else if (utility.recommendation.action === 'ARCHIVE') {

          await this.archiveScenario(scenario, utility);
          report.archived++;
        }

        // 3. 테스트 결과 기반 개선
        const analysis = await this.testAnalyzer.analyzeTestTrends(
          project.name,
          30
        );

        for (const improvement of analysis.improvements) {
          if (improvement.priority === 'HIGH') {
            await this.applyImprovement(scenario, improvement);
            report.improved++;
          }
        }
      }

      // 4. 새로운 에러 패턴 기반 시나리오 추가
      const learningResults = await this.scenarioLearner.getFrequentErrors(3);

      for (const errorPattern of learningResults) {
        const newScenario = await this.scenarioLearner.generateTestCase(
          errorPattern
        );

        await this.addScenario(project.id, newScenario);
        report.added++;
      }
    }

    // 5. Slack 리포트 전송
    await this.slackNotifier.sendMaintenanceReport(report);

    console.log('✅ Weekly maintenance completed:', report);
  }

  private async deleteScenario(
    scenario: Scenario,
    utility: UtilityScore
  ) {
    // 백업 후 삭제
    await this.db.archiveScenario(scenario, {
      reason: utility.recommendation.reason,
      utilityScore: utility.score,
      archivedAt: new Date()
    });

    await this.db.deleteScenario(scenario.id);

    console.log(`🗑️  Deleted low-utility scenario: ${scenario.name} (score: ${utility.score})`);
  }

  private async applyImprovement(
    scenario: Scenario,
    improvement: Improvement
  ) {
    switch (improvement.suggestion.action) {
      case 'INCREASE_TIMEOUT':
        scenario.timeout = improvement.suggestion.suggestedTimeout;
        break;

      case 'ADD_DELAY':
        // 각 단계 사이에 지연 추가
        for (const step of scenario.steps) {
          step.delay_after = improvement.suggestion.suggestedDelay;
        }
        break;
    }

    await this.db.updateScenario(scenario);

    console.log(`✨ Improved scenario: ${scenario.name} - ${improvement.type}`);
  }
}
```

### 데이터베이스 스키마 확장

```sql
-- 에러 패턴 추적 테이블
CREATE TABLE error_patterns (
  id SERIAL PRIMARY KEY,
  project_name VARCHAR(100) NOT NULL,
  error_hash VARCHAR(64) NOT NULL,      -- 에러 시그니처 해시
  error_message TEXT NOT NULL,
  error_category VARCHAR(50),            -- 'TIMEOUT', 'DATABASE', 'AUTH', etc.
  endpoint VARCHAR(500),
  method VARCHAR(10),
  status_code INTEGER,
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  occurrence_count INTEGER DEFAULT 1,
  scenario_generated BOOLEAN DEFAULT FALSE,
  scenario_id INTEGER REFERENCES scenarios(id),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(project_name, error_hash)
);

-- 시나리오 활용도 추적
CREATE TABLE scenario_metrics (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
  calculated_at TIMESTAMP DEFAULT NOW(),

  -- 메트릭
  execution_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  avg_duration_ms INTEGER,
  last_executed_at TIMESTAMP,
  last_failure_at TIMESTAMP,

  -- 활용도 점수
  utility_score DECIMAL(5,2),
  recommendation VARCHAR(20),             -- 'KEEP', 'REVIEW', 'ARCHIVE', 'DELETE'

  -- 메타데이터
  period_days INTEGER DEFAULT 90,

  UNIQUE(scenario_id, calculated_at)
);

-- 시나리오 아카이브 (삭제된 시나리오 백업)
CREATE TABLE scenario_archive (
  id SERIAL PRIMARY KEY,
  original_scenario_id INTEGER,
  scenario_data JSONB NOT NULL,           -- 전체 시나리오 백업
  archived_reason TEXT,
  utility_score DECIMAL(5,2),
  archived_at TIMESTAMP DEFAULT NOW(),
  can_restore BOOLEAN DEFAULT TRUE
);

-- 시나리오 개선 이력
CREATE TABLE scenario_improvements (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
  improvement_type VARCHAR(50),            -- 'TIMEOUT_ADJUSTED', 'DELAY_ADDED', etc.
  before_value JSONB,
  after_value JSONB,
  reason TEXT,
  applied_by VARCHAR(20) DEFAULT 'AUTO',  -- 'AUTO' or 'MANUAL'
  applied_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_error_patterns_project ON error_patterns(project_name, last_seen DESC);
CREATE INDEX idx_error_patterns_count ON error_patterns(occurrence_count DESC);
CREATE INDEX idx_scenario_metrics_score ON scenario_metrics(utility_score);
CREATE INDEX idx_scenario_metrics_scenario ON scenario_metrics(scenario_id, calculated_at DESC);
```

### Slack 알림 (주간 유지보수 리포트)

```
📊 HWTestAgent 주간 시나리오 유지보수 리포트

📅 기간: 2026-01-01 ~ 2026-01-07
🔍 분석 대상: 47개 시나리오

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 실행 요약:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 유지: 35개 (활용도 60점 이상)
🔄 개선: 7개 (타임아웃 조정, 지연 추가)
➕ 추가: 3개 (새로운 에러 패턴 감지)
📦 아카이브: 1개 (활용도 낮음)
🗑️  삭제: 1개 (자동생성, 활용도 매우 낮음)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
➕ 새로 추가된 시나리오:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. "Database Connection Pool 고갈 테스트"
   • 원인: 지난 주 3회 동일 에러 발생
   • 신뢰도: 85%
   • 다음 실행: 내일 06:00

2. "Redis Session 만료 테스트"
   • 원인: 지난 주 5회 동일 에러 발생
   • 신뢰도: 92%
   • 다음 실행: 내일 06:00

3. "JWT 키 로테이션 테스트"
   • 원인: 지난 주 2회 동일 에러 발생
   • 신뢰도: 78%
   • 다음 실행: 검토 필요

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 개선된 시나리오:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. "WBHubManager SSO 인증 테스트"
   • 개선: 타임아웃 10s → 15s
   • 이유: 평균 응답 시간 12s

2. "FinHub 대시보드 로딩 테스트"
   • 개선: 요청 간 지연 3s 추가
   • 이유: Rate Limit 회피

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗑️  삭제된 시나리오:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. "Static Asset 로딩 테스트" (자동생성)
   • 활용도 점수: 12/100
   • 이유: 90일간 문제 미발견, 100% 성공률
   • 백업: scenario_archive #45

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 상세 리포트: https://hwtest.up.railway.app/maintenance/2026-01-07
📋 복원 가능: https://hwtest.up.railway.app/archive
```

### 설정 파일 (config/learning.yaml)

```yaml
# 자가 학습 설정

error_pattern_detection:
  enabled: true
  min_occurrences: 3              # 최소 3회 발생 시 시나리오 생성
  confidence_threshold: 0.7       # 70% 이상 신뢰도
  auto_add_scenarios: true        # 자동 시나리오 추가 활성화

scenario_utility:
  enabled: true
  analysis_period_days: 90        # 90일 기준 분석

  thresholds:
    delete: 20                     # 20점 미만 삭제
    archive: 40                    # 40점 미만 아카이브
    review: 60                     # 60점 미만 검토

  auto_delete:
    enabled: true
    only_auto_generated: true     # 자동생성만 자동 삭제
    require_approval: false       # 승인 불필요

maintenance_schedule:
  weekly_analysis: "0 0 * * 0"    # 매주 일요일 자정
  daily_learning: "0 2 * * *"     # 매일 02:00 에러 패턴 학습

notifications:
  slack_weekly_report: true
  slack_scenario_added: true
  slack_scenario_deleted: true
```

### API 엔드포인트 추가

```typescript
// GET /api/scenarios/insights
// 시나리오 인사이트 조회
{
  "success": true,
  "data": {
    "error_patterns": [
      {
        "id": 15,
        "category": "DATABASE",
        "message": "Connection pool exhausted",
        "occurrences": 5,
        "first_seen": "2026-01-01T10:30:00Z",
        "scenario_generated": false,
        "confidence": 0.92
      }
    ],
    "low_utility_scenarios": [
      {
        "scenario_id": 42,
        "name": "Static Asset Loading Test",
        "utility_score": 12,
        "recommendation": "DELETE"
      }
    ],
    "recommended_improvements": [
      {
        "scenario_id": 8,
        "type": "INCREASE_TIMEOUT",
        "current_timeout": 10000,
        "suggested_timeout": 15000,
        "reason": "Average duration: 12s"
      }
    ]
  }
}

// POST /api/scenarios/apply-recommendations
// 추천 사항 일괄 적용
{
  "apply_improvements": true,
  "add_new_scenarios": true,
  "delete_low_utility": false  // 수동 확인 후 삭제
}
```

---

## 🔒 보안 고려사항

1. **API 인증**: 간단한 Bearer 토큰 방식
   - 환경 변수: `HWTEST_API_KEY`
   - GitHub Actions Secret에 저장

2. **Slack Webhook URL**: 환경 변수로 관리
   - Railway 환경 변수에만 저장

3. **Rate Limiting**: Express-rate-limit 사용
   - API 엔드포인트당 분당 10회 제한

---

## 📈 성공 지표 (KPI)

### Phase 1 완료 기준:
- [ ] GitHub 리포지토리 생성 및 코드 푸시
- [ ] Railway 배포 성공 (24/7 실행 확인)
- [ ] WBHubManager 정밀 테스트 9개 항목 자동화 (100% 성공률)
- [ ] Slack 알림 정상 작동 (성공/실패 모두)
- [ ] 간단한 웹 대시보드 접근 가능
- [ ] GitHub Actions 스케줄러 연동 (매일 06:00, 18:00 자동 실행)

### 품질 목표:
- 테스트 실행 성공률: 95% 이상
- 테스트 완료 시간: 5분 이내
- 알림 전송 지연: 10초 이내
- 대시보드 로딩 시간: 2초 이내

---

## 🗓️ 타임라인

| Phase | 기간 | 주요 작업 |
|-------|------|----------|
| **Phase 1 (MVP)** | 1주 | 프로젝트 초기화, 핵심 기능 구현, Railway 배포, GitHub Actions 연동, 간단한 대시보드 |
| **Phase 2** | 1주 | SSO 테스트 추가, WBFinHub 테스트, 히스토리 트렌드 분석 |
| **Phase 3** | 1주 | 통합 테스트, 전체 Hub 테스트 추가, 고급 대시보드 |

---

## 🔄 향후 개선 사항 (Phase 2+)

1. **Playwright E2E 테스트**: 브라우저 자동화 테스트
2. **Docker Adapter**: 로컬 Docker 컨테이너 테스트
3. **성능 테스트**: 응답 시간, 부하 테스트
4. **Prisma ORM**: 타입 안전한 DB 쿼리
5. **Discord/Email 알림**: 다중 채널 지원
6. **테스트 스케줄 UI**: 웹에서 스케줄 관리
7. **멀티 환경 지원**: Production, Staging, Local 병렬 테스트

---

## 📝 참고 문서

- [WHTestManager 설계 문서](../../WorkHubShared/WHTestManager-설계.md)
- [기존 Playwright 테스트](../tests/e2e/)
- [Railway 문서](https://docs.railway.app/)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Slack Webhook API](https://api.slack.com/messaging/webhooks)

---

## ✅ 최종 체크리스트

### 시작 전 준비:
- [ ] Slack Webhook URL 발급
- [ ] Railway 계정 확인
- [ ] GitHub 계정 확인 (peterchung0331)

### Phase 1 완료 후:
- [ ] README.md 작성 (설치, 사용법, 환경 변수)
- [ ] Railway 환경 변수 설정 완료
- [ ] GitHub Actions Secret 설정 완료
- [ ] 실제 테스트 1회 수동 실행 및 검증
- [ ] Slack 알림 수신 확인

---

**작성자:** Peter Chung
**최종 수정일:** 2026-01-01
