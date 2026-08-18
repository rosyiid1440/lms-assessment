/**
 * Generic Cache Interface for Permission, Projection, and Dashboard caching.
 * Ready to be swapped with RedisClusterProvider in the future.
 */
export interface ICache<TValue> {
  get(key: string): Promise<TValue | null>;
  set(key: string, value: TValue, ttlMs?: number, tags?: string[]): Promise<void>;
  delete(key: string): Promise<void>;
  
  /**
   * Powerful feature for granular invalidation without knowing exact keys.
   * e.g., invalidateByTag('role_id:123') wipes all permission caches for that role.
   */
  invalidateByTag(tag: string): Promise<void>;
}

/**
 * In-Memory implementation using Maps for testing and single-node deployments.
 */
export class MemoryCacheProvider<TValue> implements ICache<TValue> {
  private store = new Map<string, { value: TValue; expiry: number; tags: string[] }>();

  async get(key: string): Promise<TValue | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: TValue, ttlMs = 3600000, tags: string[] = []): Promise<void> {
    this.store.set(key, {
      value,
      expiry: Date.now() + ttlMs,
      tags
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async invalidateByTag(tag: string): Promise<void> {
    // In Redis, this would be implemented via SADD to a tag-set, then SUNION and DEL.
    // In memory, we iterate.
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.includes(tag)) {
        this.store.delete(key);
      }
    }
  }
}
