/**
 * Abstraction for Permission Caching
 */
export interface IPermissionCache {
  get(roleId: string, permissionString: string): boolean | null;
  set(roleId: string, permissionString: string, hasPermission: boolean, ttlMs?: number): void;
  invalidateRole(roleId: string): void;
}

/**
 * In-Memory Implementation with basic TTL
 */
export class MemoryPermissionCache implements IPermissionCache {
  // Key: roleId::permissionString, Value: { data, expiry }
  private store = new Map<string, { hasPermission: boolean; expiry: number }>();
  private readonly defaultTtlMs = 60 * 60 * 1000; // 1 hour

  get(roleId: string, permissionString: string): boolean | null {
    const key = `${roleId}::${permissionString}`;
    const entry = this.store.get(key);
    
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null; // Expired
    }
    
    return entry.hasPermission;
  }

  set(roleId: string, permissionString: string, hasPermission: boolean, ttlMs = this.defaultTtlMs): void {
    const key = `${roleId}::${permissionString}`;
    this.store.set(key, {
      hasPermission,
      expiry: Date.now() + ttlMs,
    });
  }

  invalidateRole(roleId: string): void {
    const prefix = `${roleId}::`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}
