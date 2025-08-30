interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 全局统一的加载动画组件
 * 使用主题色 emerald-500，支持不同尺寸
 */
export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 border-2',
    md: 'h-14 w-14 border-3', 
    lg: 'h-24 w-24 border-4'
  };

  return (
    <div className={`inline-block animate-spin rounded-full border-gray-200 border-t-emerald-500 ${sizeClasses[size]} ${className}`}></div>
  );
}