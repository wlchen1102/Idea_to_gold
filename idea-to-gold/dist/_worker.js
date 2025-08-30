
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    try {
      // 处理静态资源
      if (url.pathname.startsWith('/_next/static/')) {
        return await getAssetFromKV({
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        }, {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST,
        });
      }
      
      // 处理根路径，重定向到 landing 页面
      if (url.pathname === '/') {
        return Response.redirect(url.origin + '/landing', 302);
      }
      
      // 对于其他路径，返回基本的 HTML 结构
      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>点子成金</title>
  <link rel="stylesheet" href="/_next/static/css/app/layout.css">
</head>
<body>
  <div id="__next">
    <div>页面正在加载中...</div>
  </div>
  <script src="/_next/static/chunks/webpack.js"></script>
  <script src="/_next/static/chunks/main.js"></script>
</body>
</html>`;
      
      return new Response(html, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    } catch (e) {
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
