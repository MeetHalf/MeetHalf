import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

/**
 * Create an LRU cache with TTL
 * @param ttl Time-to-live in milliseconds (default: 5 minutes)
 */
export const createCache = <T extends {} = any>(ttl: number = 5 * 60 * 1000) => {
  return new LRUCache<string, T>({
    max: 500, // Maximum number of items
    ttl,      // Time-to-live per item
  });
};

/**
 * Generate a cache key from prefix and parameters using MD5 hash
 * @param prefix Cache key prefix (e.g., "geocode", "directions")
 * @param params Parameters object to hash
 * @returns Cache key in format "prefix:hash"
 */
export const makeCacheKey = (prefix: string, params: object): string => {
  // Normalize parameters recursively. Using Object.keys(params) as the
  // JSON.stringify replacer only includes top-level keys and turns nested
  // location objects into `{}`, causing unrelated midpoint requests to share
  // one cached result.
  const sortKeys = (value: any): any => {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((result, key) => {
          result[key] = sortKeys(value[key]);
          return result;
        }, {} as Record<string, any>);
    }
    return value;
  };

  const normalized = JSON.stringify(sortKeys(params));
  const hash = crypto.createHash('md5').update(normalized).digest('hex');
  return `${prefix}:${hash}`;
};

