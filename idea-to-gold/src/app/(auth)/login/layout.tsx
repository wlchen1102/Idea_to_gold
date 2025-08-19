// 为了确保 /(auth)/login 段落完全动态渲染，避免在构建阶段被预渲染
// 注意：此文件是服务端组件（没有 'use client'），用于声明段落配置

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AuthLoginLayout({ children }: { children: React.ReactNode }) {
  // 仅作为包裹器返回 children，不增加任何副作用
  return <>{children}</>
}