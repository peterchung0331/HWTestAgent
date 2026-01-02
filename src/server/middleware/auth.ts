/**
 * Authentication Middleware
 * Simple Bearer token authentication
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Verify API key from Authorization header
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.HWTEST_API_KEY;

  if (!apiKey) {
    console.warn('⚠️  HWTEST_API_KEY not configured, skipping authentication');
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'Missing Authorization header'
    });
    return;
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || token !== apiKey) {
    res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
    return;
  }

  next();
}

export default { authenticateApiKey };
