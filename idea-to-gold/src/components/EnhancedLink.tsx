"use client";

// 文件用途：增强版 Link 组件与用于创意卡片的 CreativeLink 容器
// - 在鼠标悬浮时预取目标页面与对应创意的评论列表数据，遵循“先响应，后处理”原则
// - 预取评论的请求参数与 CommentsSection 中实际请求保持一致（limit=20, offset=0, include_likes=1），
//   以利用浏览器 HTTP 缓存，避免重复网络请求
// - 通过 Supabase 获取客户端会话并在有 token 的情况下携带 Authorization 头，以返回个性化点赞状态

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { requireSupabaseClient } from "@/lib/supabase";
import { commentsCache } from "@/lib/commentsCache";

// 预加载缓存，避免重复请求
const prefetchCache = new Set<string>();

// 预加载评论数据
const prefetchComments = async (creativeId: string) => {
  const cacheKey = `comments:${creativeId}`;
  
  // 如果已经预加载过，跳过
  if (prefetchCache.has(cacheKey)) {
    return;
  }
  
  try {
    prefetchCache.add(cacheKey);
    
    // 获取用户token用于识别当前用户的点赞状态
    const supabase = requireSupabaseClient();
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes.data?.session?.access_token ?? "";
    
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    // 预加载评论数据（与 CommentsSection 的默认请求参数保持一致）
    const url = `/api/comments?creative_id=${encodeURIComponent(creativeId)}&limit=20&offset=0&include_likes=1`;
    
    fetch(url, { 
      headers,
      cache: 'default' // 利用浏览器缓存
    })
      .then(async (res) => {
        if (!res.ok) {
          prefetchCache.delete(cacheKey);
          return;
        }
        // 将预取到的数据写入内存缓存，确保进入详情页即可渲染
        try {
          const json = await res.json();
          const comments = Array.isArray(json?.comments) ? json.comments : [];
          const pagination = json?.pagination ?? { limit: 20, offset: 0, total: comments.length, hasMore: false };
          commentsCache.set(creativeId, { comments, pagination }, 20, 0);
        } catch {
          // JSON 解析失败不影响用户体验
        }
      })
      .catch(() => {
        // 预加载失败不影响用户体验，静默处理
        prefetchCache.delete(cacheKey);
      });
  } catch {
    // 预加载失败，从缓存中移除以便下次重试
    prefetchCache.delete(cacheKey);
  }
};

interface EnhancedLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLAnchorElement>) => void;
}

/**
 * 增强的Link组件，支持自动loading状态和预加载
 */
export function EnhancedLink({
  href,
  children,
  className,
  prefetch = true,
  onClick,
  onMouseEnter,
  onFocus,
  ...props
}: EnhancedLinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 如果有自定义onClick，先执行
    if (onClick) {
      onClick(e);
      // 如果preventDefault被调用，不继续执行
      if (e.defaultPrevented) {
        return;
      }
    }

    e.preventDefault();
    
    // 动画完成后立即跳转，不等待服务端渲染
    setTimeout(() => {
      router.push(href);
    }, 100); // 100ms 动画时间后立即跳转
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 预加载页面
    router.prefetch(href);
    
    // 如果是创意详情页面，预加载评论数据
    if (href.startsWith('/idea/')) {
      const creativeId = href.split('/idea/')[1];
      if (creativeId) {
        prefetchComments(creativeId);
      }
    }
    
    // 执行自定义onMouseEnter
    if (onMouseEnter) {
      onMouseEnter(e);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
    // 预加载页面
    router.prefetch(href);
    
    // 执行自定义onFocus
    if (onFocus) {
      onFocus(e);
    }
  };

  return (
    <Link
      href={href}
      className={`${className} transition-all duration-150 ease-out`}
      prefetch={prefetch}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...props}
    >
      {children}
    </Link>
  );
}

/**
 * 用于创意卡片的专用Link组件
 */
export function CreativeLink({
  creativeId,
  children,
  className,
}: {
  creativeId: string;
  children: ReactNode;
  className?: string;
}) {
  const href = `/idea/${creativeId}`;
  const router = useRouter();
  
  // 处理点击：先播放动画，动画完成后跳转
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    
    // 添加点击动画效果
    target.style.transform = 'translateY(2px) scale(0.98)';
    target.style.opacity = '0.8';
    
    // 等待动画完成后跳转（CreativityCard的transition是200ms）
    setTimeout(() => {
      router.push(href);
    }, 100);
  };
  
  return (
    <div 
      className={`${className} cursor-pointer`}
      onClick={handleCardClick}
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onMouseEnter={(_e) => {
        // 预加载创意详情页面
        router.prefetch(href);
        
        // 预加载评论数据
        prefetchComments(creativeId);
      }}
    >
      {children}
    </div>
  );
}