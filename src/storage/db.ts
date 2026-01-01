/**
 * PostgreSQL Database Connection Module
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Database configuration
const config: pg.PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 20,                    // Maximum pool size
  idleTimeoutMillis: 30000,   // Close idle clients after 30s
  connectionTimeoutMillis: 5000, // Timeout after 5s
};

// Create connection pool
export const pool = new Pool(config);

// Pool error handling
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Connection test
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

/**
 * Execute a query
 */
export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Query executed in ${duration}ms:`, { text, rowCount: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<pg.PoolClient> {
  return await pool.connect();
}

/**
 * Close all database connections
 */
export async function close(): Promise<void> {
  await pool.end();
  console.log('🔌 Database connections closed');
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connection test successful:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT received, closing database connections...');
  await close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM received, closing database connections...');
  await close();
  process.exit(0);
});

export default {
  pool,
  query,
  getClient,
  close,
  testConnection
};
