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

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link

# Deploy
railway up
```

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
