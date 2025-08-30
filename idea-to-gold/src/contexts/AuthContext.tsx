"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { requireSupabaseClient } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// 用户资料接口
interface UserProfile {
  id: string;
  nickname: string;
  avatar_url?: string;
  bio?: string;
}

// 认证状态接口
interface AuthState {
  user: UserProfile | null;
  authUser: User | null;
  session: Session | null;
  loading: boolean;
  token: string | null;
  userId: string | null;
}

// 认证Context接口
interface AuthContextType extends AuthState {
  // 刷新认证状态的方法
  refreshAuth: () => Promise<void>;
  // 登出方法
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
}

// 创建Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    authUser: null,
    session: null,
    loading: true,
    token: null,
    userId: null,
  });

  // 获取用户资料 - 优化版本：使用统一的profile API接口
  const fetchUserProfile = async (token: string): Promise<UserProfile | null> => {
    try {
      // 使用优化过的profile API接口，避免直接查询数据库
      const response = await fetch('/api/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.warn('获取用户资料失败:', response.status, response.statusText);
        return null;
      }
      
      const result = await response.json() as { profile: UserProfile | null };
      return result.profile;
    } catch (error) {
      console.warn('获取用户资料异常:', error);
      return null;
    }
  };

  // 更新认证状态的辅助函数
  const updateAuthState = useCallback(async (session: Session | null) => {
    let userProfile: UserProfile | null = null;
    
    if (session?.user && session?.access_token) {
      userProfile = await fetchUserProfile(session.access_token);
      
      // 如果获取用户资料失败（token可能已过期），清理认证状态
      if (!userProfile) {
        console.warn('用户资料获取失败，可能token已过期，清理认证状态');
        
        // 清理localStorage状态
        if (typeof window !== 'undefined') {
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('userId');
        }
        
        // 设置为未登录状态
        setAuthState({
          user: null,
          authUser: null,
          session: null,
          loading: false,
          token: null,
          userId: null,
        });
        return;
      }
    } else {
      // 当session无效时，清理localStorage状态
      if (typeof window !== 'undefined') {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userId');
      }
    }
    
    setAuthState({
      user: userProfile,
      authUser: session?.user || null,
      session,
      loading: false,
      token: session?.access_token || null,
      userId: session?.user?.id || null,
    });
  }, []);

  // 刷新认证状态
  const refreshAuth = async () => {
    try {
      const supabase = requireSupabaseClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('获取认证状态失败:', error);
        await updateAuthState(null);
        return;
      }
      
      await updateAuthState(session);
    } catch (error) {
      console.warn('刷新认证状态异常:', error);
      await updateAuthState(null);
    }
  };

  // 登出方法
  const signOut = async () => {
    try {
      const supabase = requireSupabaseClient();
      await supabase.auth.signOut();
      await updateAuthState(null);
      
      // 清理本地存储
      if (typeof window !== 'undefined') {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userId');
      }
    } catch (error) {
      console.warn('登出失败:', error);
    }
  };

  // 登出方法的别名
  const logout = signOut;

  // 初始化认证状态和监听器
  useEffect(() => {
    let mounted = true;
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    let authChangedHandler: (() => void) | null = null;

    const initAuth = async () => {
      try {
        // 确保只在浏览器环境中执行
        if (typeof window === 'undefined') {
          setAuthState(prev => ({ ...prev, loading: false }));
          return;
        }

        const supabase = requireSupabaseClient();
        
        // 获取当前会话
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('初始化认证状态失败:', error);
        }
        
        if (mounted) {
          await updateAuthState(session);
        }

        // 监听认证状态变化
        const { data: listener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (mounted) {
              await updateAuthState(session);
              
              // 同步本地存储状态
              if (typeof window !== 'undefined') {
                if (session?.user) {
                  localStorage.setItem('isLoggedIn', 'true');
                  localStorage.setItem('userId', session.user.id);
                } else {
                  localStorage.removeItem('isLoggedIn');
                  localStorage.removeItem('userId');
                }
              }
            }
          }
        );
        
        authListener = listener;

        // 监听自定义的 auth:changed 事件（用于用户资料更新）
        // 优化：避免无限循环，只更新用户资料而不触发完整的认证刷新
        authChangedHandler = async () => {
          if (mounted) {
            try {
              // 重新获取当前session以确保使用最新的token
              const { data: { session: currentSession } } = await supabase.auth.getSession();
              if (currentSession?.access_token) {
                const userProfile = await fetchUserProfile(currentSession.access_token);
                if (mounted) {
                  setAuthState(prev => ({
                    ...prev,
                    user: userProfile
                  }));
                }
              }
            } catch (error) {
              console.warn('更新用户资料失败:', error);
            }
          }
        };

        window.addEventListener('auth:changed', authChangedHandler);
        
        // 清理函数中移除事件监听器
        const originalCleanup = () => {
          mounted = false;
          if (authListener) {
            try {
              authListener.subscription.unsubscribe();
            } catch (error) {
              console.warn('取消认证监听器失败:', error);
            }
          }
          if (authChangedHandler) {
            window.removeEventListener('auth:changed', authChangedHandler);
          }
        };
        
        return originalCleanup;
      } catch (error) {
        console.warn('认证初始化异常:', error);
        if (mounted) {
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      }
    };

    let cleanupFn: (() => void) | null = null;
    
    initAuth().then(cleanup => {
      cleanupFn = cleanup || null;
    }).catch(error => {
      console.warn('认证初始化失败:', error);
    });

    return () => {
      mounted = false;
      if (cleanupFn) {
        cleanupFn();
      } else {
        // 默认清理
        if (authListener) {
          try {
            authListener.subscription.unsubscribe();
          } catch (error) {
            console.warn('取消认证监听器失败:', error);
          }
        }
        if (authChangedHandler) {
          window.removeEventListener('auth:changed', authChangedHandler);
        }
      }
    };
  }, [updateAuthState]); // 移除refreshAuth依赖以避免无限循环

  const contextValue: AuthContextType = {
    ...authState,
    refreshAuth,
    logout,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// 使用认证Context的Hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// 便捷的Hook，用于获取认证状态
export function useAuthState(): AuthState {
  const { user, authUser, session, loading, token, userId } = useAuth();
  return { user, authUser, session, loading, token, userId };
}

// 便捷的Hook，用于检查是否已登录
export function useIsAuthenticated(): boolean {
  const { authUser, loading } = useAuth();
  return !loading && !!authUser;
}

// 便捷的Hook，用于获取用户token
export function useAuthToken(): string | null {
  const { token } = useAuth();
  return token;
}

// 便捷的Hook，用于获取用户ID
export function useUserId(): string | null {
  const { userId } = useAuth();
  return userId;
}