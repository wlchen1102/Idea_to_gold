"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import LoadingSpinner from "./LoadingSpinner";

// 全局Loading状态管理
interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  loadingText?: string;
  setLoadingText: (text?: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Hook for using loading context
export function useGlobalLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useGlobalLoading must be used within a LoadingProvider');
  }
  return context;
}

// Loading Provider
export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string | undefined>(undefined);
  const pathname = usePathname();

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
    if (!loading) {
      setLoadingText(undefined); // 清除loading文本
    }
  };

  // 监听路由变化，自动隐藏loading状态
  useEffect(() => {
    // 当路由变化完成时，隐藏loading状态
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 100); // 短暂延迟确保页面已渲染
      
      return () => clearTimeout(timer);
    }
  }, [pathname, isLoading]);

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading, loadingText, setLoadingText }}>
      {children}
      {isLoading && <GlobalLoadingOverlay text={loadingText} />}
    </LoadingContext.Provider>
  );
}

// Loading Overlay Component
function GlobalLoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex flex-col items-center space-y-4">
          {/* Loading Spinner */}
          <LoadingSpinner size="lg" />
          
          {/* Loading Text */}
          <div className="text-center">
            <p className="text-lg font-medium text-[#2c3e50]">
              {text || '正在加载...'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              请稍候片刻
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 简化的Loading组件，用于页面内部
export function PageLoading({ text }: { text?: string }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        {/* Loading Spinner */}
        <LoadingSpinner size="md" />
        
        {/* Loading Text */}
        <div className="text-center">
          <p className="text-base font-medium text-[#2c3e50]">
            {text || '正在加载...'}
          </p>
        </div>
      </div>
    </div>
  );
}