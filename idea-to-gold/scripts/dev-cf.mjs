#!/usr/bin/env node
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'

// 尝试监听端口判断是否可用
function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, '127.0.0.1')
  })
}

async function findFreePort(start = 3000, end = 3999) {
  for (let p = start; p <= end; p++) {
    // 按顺序查找可用端口
    // eslint-disable-next-line no-await-in-loop
    if (await checkPort(p)) return p
  }
  throw new Error(`未找到可用端口范围: ${start}-${end}`)
}

async function main() {
  const port = await findFreePort(3000, 3999)
  console.log(`[dev-cf] 使用端口 ${port} 启动 Next 开发服务器，并让 wrangler 代理该端口`)

  // 说明：在 Windows 下直接 spawn("wrangler.cmd", args) 偶发抛出 EINVAL，
  // 改为通过 shell 执行完整命令字符串，跨平台更稳健。
  const cmdLine = `wrangler pages dev --proxy ${port} -- npm run dev:next -- -p ${port}`

  const child = spawn(cmdLine, { stdio: 'inherit', shell: true })
  child.on('exit', (code) => process.exit(code ?? 0))
  child.on('error', (err) => {
    console.error('[dev-cf] 启动失败:', err)
    process.exit(1)
  })
}

main().catch((err) => {
  console.error('[dev-cf] 运行出错:', err)
  process.exit(1)
})