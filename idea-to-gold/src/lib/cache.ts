// 前端缓存工具
// 功能：提供内存缓存和localStorage缓存，优化数据加载性能

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number; // 过期时间（毫秒）
}

class FrontendCache {
  private memoryCache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_EXPIRY = 5 * 60 * 1000; // 5分钟默认过期时间

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param expiry 过期时间（毫秒），默认5分钟
   */
  set<T>(key: string, data: T, expiry: number = this.DEFAULT_EXPIRY): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry
    };
    
    // 内存缓存
    this.memoryCache.set(key, item);
    
    // localStorage缓存（仅在浏览器环境）
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(item));
      } catch (error) {
        console.warn('localStorage缓存失败:', error);
      }
    }
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据或null
   */
  get<T>(key: string): T | null {
    // 先检查内存缓存
    let item = this.memoryCache.get(key);
    
    // 如果内存缓存没有，检查localStorage
    if (!item && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`cache_${key}`);
        if (stored) {
          item = JSON.parse(stored);
          // 恢复到内存缓存
          if (item) {
            this.memoryCache.set(key, item);
          }
        }
      } catch (error) {
        console.warn('localStorage读取失败:', error);
      }
    }
    
    if (!item) {
      return null;
    }
    
    // 检查是否过期
    const now = Date.now();
    if (now - item.timestamp > item.expiry) {
      this.delete(key);
      return null;
    }
    
    return item.data;
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`cache_${key}`);
      } catch (error) {
        console.warn('localStorage删除失败:', error);
      }
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.memoryCache.clear();
    
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('cache_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('localStorage清空失败:', error);
      }
    }
  }

  /**
   * 检查缓存是否存在且未过期
   * @param key 缓存键
   * @returns 是否有效
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 获取缓存的时间戳
   * @param key 缓存键
   * @returns 时间戳或null
   */
  getTimestamp(key: string): number | null {
    const item = this.memoryCache.get(key);
    return item ? item.timestamp : null;
  }
}

// 导出单例实例
export const cache = new FrontendCache();

// 专门用于支持的创意的缓存键生成器
export const getCacheKey = {
  supportedCreatives: (userId: string, page: number = 1) => `supported_creatives_${userId}_${page}`,
  userProfile: (userId: string) => `user_profile_${userId}`,
  creativeDetail: (creativeId: string) => `creative_detail_${creativeId}`
};

// 缓存时间常量
export const CACHE_DURATION = {
  SHORT: 2 * 60 * 1000,    // 2分钟
  MEDIUM: 5 * 60 * 1000,   // 5分钟
  LONG: 15 * 60 * 1000     // 15分钟
};