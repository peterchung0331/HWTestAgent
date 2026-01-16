# HWTestAgent

**Hybrid WorkHub Test Agent** - 24/7 AI-powered automated testing system for WorkHub projects

## 🎯 Overview

HWTestAgent is a comprehensive automated testing platform that monitors and tests multiple WorkHub projects (WBHubManager, WBFinHub, WBSalesHub, WBOnboardingHub) around the clock, automatically fixing issues and learning from errors.

### Key Features

- **24/7 Automated Testing**: Runs twice daily (6 AM, 6 PM) via GitHub Actions + Railway
- **Auto-Fix System** (70%+ success rate): Automatically resolves common issues
- **AI Self-Learning**: Detects new error patterns and generates test scenarios
- **Real-time Slack Notifications**: Instant alerts on test results
- **Web Dashboard**: View test results, fix history, and scenario insights

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL (provided by Railway)
- GitHub account
- Railway account

### Installation

```bash
# Clone the repository
git clone https://github.com/peterchung0331/HWTestAgent.git
cd HWTestAgent

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

## 📦 Project Structure

```
HWTestAgent/
├── src/
│   ├── server/          # Express API server
│   ├── runner/          # Test execution engine
│   ├── analyzer/        # Test result analysis
│   ├── jobs/            # Scheduled jobs
│   ├── storage/         # Database models & repositories
│   ├── notification/    # Slack notifier
│   └── frontend/        # Next.js dashboard
├── scenarios/           # YAML test scenarios
├── config/              # Configuration files
└── .github/workflows/   # GitHub Actions
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all required environment variables.

### Test Scenarios

Test scenarios are defined in YAML format in the `scenarios/` directory. See `scenarios/wbhubmanager/precision.yaml` for an example.

## 📊 API Endpoints

### POST `/api/test/run`
Run a test scenario

```json
{
  "project": "WBHubManager",
  "scenario": "precision",
  "environment": "production",
  "auto_fix": true,
  "triggered_by": "manual"
}
```

### GET `/api/test/results`
Get test results

```bash
GET /api/test/results?limit=10&project=WBHubManager
```

### GET `/api/test/results/:id`
Get detailed test result

```bash
GET /api/test/results/123
```

## 🗃️ Error Pattern DB System

HWTestAgent includes an error pattern database that tracks, analyzes, and suggests solutions for recurring errors across WorkHub projects.

### Features

- **에러 패턴 자동 수집**: 테스트 실패 시 에러 메시지와 스택 트레이스 자동 기록
- **유사 에러 검색**: 에러 발생 시 기존 유사 패턴 및 솔루션 제안
- **솔루션 DB**: 검증된 솔루션의 성공률 기반 추천
- **프로젝트별 통계**: 에러 카테고리/프로젝트별 발생 현황 분석

### Error Categories

| 카테고리 | 설명 | 예시 |
|----------|------|------|
| TIMEOUT | 타임아웃 에러 | Connection timeout, Request timeout |
| DATABASE | DB 연결/쿼리 에러 | ECONNREFUSED, Prisma error |
| AUTH | 인증/권한 에러 | 401, 403, invalid_grant |
| NETWORK | 네트워크 에러 | ENOTFOUND, ETIMEDOUT |
| VALIDATION | 데이터 검증 에러 | Validation failed |
| RUNTIME | 런타임 에러 | TypeError, ReferenceError |
| API | API 응답 에러 | 500, 502, Bad Gateway |
| UNKNOWN | 분류 불가 | 기타 에러 |

### API Endpoints

```bash
# 에러 패턴 검색
GET /api/error-patterns?query=Connection&project=WBHubManager

# 에러 패턴 상세 조회 (솔루션 포함)
GET /api/error-patterns/1

# 에러 기록
POST /api/error-patterns/record

# 에러 통계
GET /api/error-patterns/stats?project=WBHubManager
```

### Integration with Skill Tester

스킬테스터(스킬테스터-단위, 스킬테스터-E2E, 스킬테스터-통합)는 에러 발생 시 자동으로:
1. 에러 패턴 DB에 기록
2. 유사 에러 검색
3. 솔루션 제안
4. 해결 시 성공률 업데이트

자세한 내용은 [API 문서](docs/API.md) 참조.

---

## 📝 Test Script Template System

테스트 스크립트 템플릿 시스템으로 반복되는 테스트 코드 재사용:

### Features

- **변수 치환**: `{{BASE_URL}}`, `{{TEST_USER_EMAIL}}` 등 플레이스홀더 자동 치환
- **템플릿 타입**: e2e, integration, unit
- **태그 기반 검색**: oauth, login, api 등
- **사용 통계**: 템플릿 사용 횟수 및 성공률 추적

### API Endpoints

```bash
# 템플릿 검색
GET /api/templates?type=e2e&tags=oauth

# 템플릿 상세 조회
GET /api/templates/1

# 스크립트 생성
POST /api/templates/1/generate
{
  "variables": {
    "BASE_URL": "http://localhost:3090",
    "TEST_USER_EMAIL": "test@example.com"
  }
}
```

---

## 🤖 Auto-Fix System

The Auto-Fix system automatically resolves common issues:

- **Environment Variables Missing**: Auto-sets Railway environment variables
- **Service Down**: Restarts Railway service
- **Database Connection**: Resets connection pool
- **Rate Limiting**: Clears rate limit cache
- **JWT Key Mismatch**: Syncs from Doppler and redeploys

## 🧠 Self-Learning AI

- Detects recurring error patterns (3+ occurrences)
- Automatically generates new test scenarios
- Analyzes scenario utility (100-point scoring system)
- Auto-deletes low-value scenarios (< 20 points)
- Weekly maintenance on Sundays at midnight

## 📅 Deployment

### Oracle Cloud (Production)

**Recommended deployment method for centralized error database across multiple PCs.**

#### Prerequisites
- SSH access to Oracle Cloud server (158.180.95.246)
- PostgreSQL database `testagent` created on Oracle server
- Doppler secrets configured for production environment

#### Deployment Steps

```bash
# 1. Commit and push your changes
git add .
git commit -m "feat: Add feature"
git push origin master

# 2. Run deployment script
./scripts/deploy-oracle.sh
```

The script automatically:
1. ✅ Validates local changes (type check)
2. ✅ Pushes to GitHub
3. ✅ SSH to Oracle server
4. ✅ Pulls latest code
5. ✅ Builds Docker image with BuildKit
6. ✅ Starts container with health check
7. ✅ Verifies external access

#### Access URLs
- **Dashboard**: https://workhub.biz/testagent
- **API Health**: https://workhub.biz/testagent/health
- **Error Patterns**: https://workhub.biz/testagent/api/error-patterns

#### Manual Deployment

```bash
# SSH to Oracle server
ssh -i ~/.ssh/oracle-cloud.key ubuntu@158.180.95.246

# Navigate to project
cd /home/ubuntu/workhub/HWTestAgent

# Pull latest code
git pull origin master

# Rebuild and restart
docker-compose down
DOCKER_BUILDKIT=1 docker-compose build
docker-compose up -d

# Check logs
docker logs -f hwtestagent-api
```

#### Database Setup (One-time)

```sql
-- On Oracle server
sudo -u postgres psql

CREATE DATABASE testagent;
CREATE USER testagent_user WITH PASSWORD 'testagent_secure_password';
GRANT ALL PRIVILEGES ON DATABASE testagent TO testagent_user;
\c testagent
GRANT ALL ON SCHEMA public TO testagent_user;
```

#### Nginx Configuration

Add to `/etc/nginx/sites-available/workhub`:

```nginx
location /testagent/ {
    rewrite ^/testagent/?(.*)$ /$1 break;
    proxy_pass http://localhost:4100;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
}
```

See [nginx.conf.example](nginx.conf.example) for complete configuration.

### Railway (Deprecated)

⚠️ Railway deployment is deprecated. Use Oracle Cloud for production.

### GitHub Actions

Tests run automatically:
- **Scheduled**: Daily at 6 AM and 6 PM (UTC)
- **Manual**: Via workflow_dispatch

## 📚 Documentation

- [Product Requirements Document](../docs/HWTestAgent-PRD.md)
- [Executive Summary](../docs/HWTestAgent-Executive-Summary.md)

## 🤝 Contributing

This is a private project for WaveBridge internal use.

## 📝 License

MIT License - Copyright (c) 2026 Peter Chung

## 📞 Contact

Peter Chung (@peterchung0331)

---

🤖 Generated with HWTestAgent v1.0.0
