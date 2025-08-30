
export default {
  async fetch(request, env, ctx) {
    // 这是一个简化的 worker，实际部署时 Cloudflare 会处理
    return new Response('Hello from Cloudflare Pages!', {
      headers: { 'content-type': 'text/plain' },
    });
  },
};
