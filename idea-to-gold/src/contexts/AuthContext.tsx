"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { requireSupabaseClient } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// 用户资料接口
interface UserProfile {
  id: string;
  nickname: string;
  avatar_url?: string;
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

  // 获取用户资料
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const supabase = requireSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn('获取用户资料失败:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('获取用户资料异常:', error);
      return null;
    }
  };

  // 更新认证状态的辅助函数
  const updateAuthState = async (session: Session | null) => {
    let userProfile: UserProfile | null = null;
    
    if (session?.user) {
      userProfile = await fetchUserProfile(session.user.id);
    }
    
    setAuthState({
      user: userProfile,
      authUser: session?.user || null,
      session,
      loading: false,
      token: session?.access_token || null,
      userId: session?.user?.id || null,
    });
  };

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
      } catch (error) {
        console.warn('认证初始化异常:', error);
        if (mounted) {
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      if (authListener) {
        try {
          authListener.subscription.unsubscribe();
        } catch (error) {
          console.warn('取消认证监听器失败:', error);
        }
      }
    };
  }, []);

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