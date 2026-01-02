/**
 * HWTestAgent Server
 * Express API server for test automation
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from '../storage/db.js';
import apiRouter from './routes/api.js';
import TestScheduler from '../scheduler/TestScheduler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const PORT = process.env.PORT || 4100;

// ============================================
// Middleware
// ============================================

// CORS
app.use(cors());

// JSON body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  }
});

app.use('/api', limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// ============================================
// Routes
// ============================================

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../../public')));

// API routes
app.use('/api', apiRouter);

// Root route - serve dashboard HTML
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Server error:', err);

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// ============================================
// Server Start
// ============================================

async function startServer() {
  try {
    console.log('\n🚀 Starting HWTestAgent Server...\n');

    // Test database connection
    console.log('🔍 Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Database connection failed');
      console.error('   Please check DATABASE_URL environment variable');
      console.error('   Run: npm run db:migrate to create tables\n');
      process.exit(1);
    }

    console.log('');

    // Initialize scheduler
    const scheduler = new TestScheduler();
    await scheduler.initialize();

    // Start server
    app.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 HWTestAgent Server Started');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
      console.log(`📊 API Docs: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔔 Slack: ${process.env.SLACK_WEBHOOK_URL ? 'Enabled ✅' : 'Disabled ⚠️'}`);
      console.log(`⏰ Scheduled Tests: ${scheduler.getScheduledTests().length}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('💡 Ready to accept test requests!\n');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n⏸️  SIGTERM received, shutting down gracefully...');
      scheduler.stopAll();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('\n⏸️  SIGINT received, shutting down gracefully...');
      scheduler.stopAll();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
