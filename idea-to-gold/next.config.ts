// Next.js 配置文件：集成 Cloudflare Pages（next-on-pages），并配置外部图片域名白名单，确保使用 next/image 渲染远程头像与图片可用。

import type { NextConfig } from "next";
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

// 在本地开发（由 wrangler 代理 Next 开发服务器）时，注入 Cloudflare 的运行时上下文
// 说明：之前使用了顶层 await，Next 在编译 next.config.ts 时以 CJS 方式执行，导致 "await is not defined"。
// 这里改为导出一个 async 函数，确保在返回配置前完成 setup。
export default async function nextConfig(): Promise<NextConfig> {
  if (process.env.NODE_ENV === "development") {
    await setupDevPlatform();
  }

  return {
    // 这是关键：禁用静态导出，强制服务端渲染
    output: undefined, // 不设置 export

    // 针对 Cloudflare Pages 优化
    images: {
      // Cloudflare Pages 不支持 Next.js 图片优化，使用浏览器直出
      unoptimized: true,
      // 允许的远程图片域名（头像等）
      remotePatterns: [
        { protocol: "https", hostname: "ui-avatars.com" },
        { protocol: "https", hostname: "lh3.googleusercontent.com" },
        { protocol: "https", hostname: "avatars.githubusercontent.com" },
        { protocol: "https", hostname: "images.unsplash.com" },
        { protocol: "https", hostname: "cdn.discordapp.com" }
      ]
    },

    // 确保动态路由不被静态化
    trailingSlash: false,

    // 路由兼容：将旧的 /project/* 永久重定向到规范路径 /projects/*
    redirects: async () => [
      {
        source: "/project/:path*",
        destination: "/projects/:path*",
        permanent: true,
      },
    ],

    // 外部包配置（用于 Edge Runtime）
    serverExternalPackages: []
  };
}
