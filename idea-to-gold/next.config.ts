import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 这是关键：禁用静态导出，强制服务端渲染
  output: undefined, // 不设置 export
  
  // 针对 Cloudflare Pages 优化
  images: {
    unoptimized: true // Cloudflare Pages 不支持 Next.js 图片优化
  },
  
  // 确保动态路由不被静态化
  trailingSlash: false,
  
  // 外部包配置（用于 Edge Runtime）
  serverExternalPackages: []
};

export default nextConfig;
