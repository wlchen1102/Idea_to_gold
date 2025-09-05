// 文件用途：评论数据缓存管理器
// - 为创意详情页评论提供内存缓存支持，避免重复网络请求
// - 在鼠标悬浮预取与进入详情页之间建立数据桥梁
// - 缓存基于创意ID进行键值存储，支持过期时间控制

interface CommentDTO {
  id: string;
  content: string;
  author_id: string;
  creative_id: string | null;
  project_log_id: string | null;
  parent_comment_id: string | null;
  created_at: string;
  profiles?: {
    nickname: string | null;
    avatar_url: string | null;
  } | null;
  likes_count?: number;
  current_user_liked?: boolean;
}

interface CachedCommentsData {
  comments: CommentDTO[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  cachedAt: number; // 缓存时间戳
}

class CommentsCache {
  private cache = new Map<string, CachedCommentsData>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟过期时间

  /**
   * 生成缓存键
   */
  private getCacheKey(creativeId: string, limit = 20, offset = 0): string {
    return `comments:${creativeId}:${limit}:${offset}`;
  }

  /**
   * 设置评论缓存
   */
  set(
    creativeId: string,
    data: {
      comments: CommentDTO[];
      pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
      };
    },
    limit = 20,
    offset = 0
  ): void {
    const key = this.getCacheKey(creativeId, limit, offset);
    this.cache.set(key, {
      ...data,
      cachedAt: Date.now(),
    });
  }

  /**
   * 获取评论缓存
   */
  get(creativeId: string, limit = 20, offset = 0): CachedCommentsData | null {
    const key = this.getCacheKey(creativeId, limit, offset);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - cached.cachedAt > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * 检查是否有缓存
   */
  has(creativeId: string, limit = 20, offset = 0): boolean {
    return this.get(creativeId, limit, offset) !== null;
  }

  /**
   * 清除指定创意的所有缓存
   */
  clearCreative(creativeId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`comments:${creativeId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清除过期缓存
   */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [key, data] of this.cache.entries()) {
      if (now - data.cachedAt > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}

// 导出单例实例
export const commentsCache = new CommentsCache();
export type { CommentDTO, CachedCommentsData };