import type { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const stores = new Map<string, Map<string, RateLimitStore>>();

/**
 * Clean up expired entries every 5 minutes to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  stores.forEach((ipMap) => {
    ipMap.forEach((entry, ip) => {
      if (now > entry.resetTime) {
        ipMap.delete(ip);
      }
    });
  });
}, 5 * 60 * 1000);

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  name?: string;
}) {
  const name = options.name || 'default';
  if (!stores.has(name)) {
    stores.set(name, new Map<string, RateLimitStore>());
  }
  const ipMap = stores.get(name)!;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    let record = ipMap.get(ip);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs
      };
      ipMap.set(ip, record);
      return next();
    }

    record.count++;
    if (record.count > options.max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: options.message || 'Слишком много запросов с вашего IP адреса. Пожалуйста, подождите.',
        retryAfterSeconds
      });
    }

    next();
  };
}

// Pre-configured rate limiters
export const authRateLimiter = createRateLimiter({
  name: 'auth',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts
  message: 'Слишком много попыток авторизации. Попробуйте снова через 15 минут.'
});

export const mutationRateLimiter = createRateLimiter({
  name: 'mutation',
  windowMs: 60 * 1000, // 1 minute
  max: 40, // 40 mutations per minute
  message: 'Превышена частота отправки данных. Пожалуйста, замедлите отправку запросов.'
});

export const globalApiRateLimiter = createRateLimiter({
  name: 'global',
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  message: 'Превышен общий лимит запросов к API.'
});
