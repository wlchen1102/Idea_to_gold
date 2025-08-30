"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, MouseEvent, FocusEvent } from "react";
import { requireSupabaseClient } from "@/lib/supabase";

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
    
    // 预加载评论数据（只加载第一页）
    const url = `/api/comments?creative_id=${encodeURIComponent(creativeId)}&limit=20&offset=0`;
    
    fetch(url, { 
      headers,
      cache: 'default' // 利用浏览器缓存
    }).catch(() => {
      // 预加载失败不影响用户体验，静默处理
      prefetchCache.delete(cacheKey);
    });
  } catch (error) {
    // 预加载失败，从缓存中移除以便下次重试
    prefetchCache.delete(cacheKey);
  }
};

interface EnhancedLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  loadingText?: string;
  prefetch?: boolean;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  onMouseEnter?: (e: MouseEvent<HTMLAnchorElement>) => void;
  onFocus?: (e: FocusEvent<HTMLAnchorElement>) => void;
}

/**
 * 增强的Link组件，支持自动loading状态和预加载
 */
export function EnhancedLink({
  href,
  children,
  className,
  loadingText,
  prefetch = true,
  onClick,
  onMouseEnter,
  onFocus,
  ...props
}: EnhancedLinkProps) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
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

  const handleMouseEnter = (e: MouseEvent<HTMLAnchorElement>) => {
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

  const handleFocus = (e: FocusEvent<HTMLAnchorElement>) => {
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
  ...props
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
      className={className}
      onMouseEnter={(e) => {
        // 预加载创意详情页面
        router.prefetch(href);
        
        // 预加载评论数据
        prefetchComments(creativeId);
      }}
    >
      {React.cloneElement(children as React.ReactElement, {
        onCardClick: handleCardClick
      })}
    </div>
  );
}