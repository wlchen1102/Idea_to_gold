#!/usr/bin/env node
import { createServer, connect as netConnect } from 'node:net'
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

// 等待端口开始对外提供服务（Next 启动完成）
async function waitForPortReady(port, { timeoutMs = 30000, intervalMs = 400 } = {}) {
  const start = Date.now()
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await new Promise((resolve, reject) => {
        const socket = netConnect({ port, host: '127.0.0.1' }, () => {
          socket.end()
          resolve()
        })
        socket.once('error', reject)
        setTimeout(() => {
          socket.destroy()
          reject(new Error('timeout'))
        }, intervalMs)
      })
      return
    } catch {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`等待端口 ${port} 就绪超时（>${timeoutMs}ms）`)
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }
}

async function main() {
  const port = await findFreePort(3000, 3999)
  console.log(`[dev-cf] 选择端口 ${port}，先启动 Next 开发服务器，再由 wrangler 进行代理`)

  // 1) 先启动 Next 开发服务器
  const nextCmd = `npm run dev:next -- -p ${port}`
  const nextChild = spawn(nextCmd, { stdio: 'inherit', shell: true })

  nextChild.on('exit', (code) => {
    console.log(`[dev-cf] Next 进程已退出，code=${code}`)
    process.exit(code ?? 0)
  })
  nextChild.on('error', (err) => {
    console.error('[dev-cf] 启动 Next 失败:', err)
    process.exit(1)
  })

  // 2) 等待 Next 就绪
  await waitForPortReady(port).catch((err) => {
    console.error('[dev-cf] 等待 Next 就绪失败:', err)
    process.exit(1)
  })

  // 3) 启动 wrangler 代理该端口
  const wranglerCmd = `wrangler pages dev --proxy ${port}`
  console.log('[dev-cf] Next 就绪，启动 wrangler 代理:', wranglerCmd)
  const wranglerChild = spawn(wranglerCmd, { stdio: 'inherit', shell: true })

  wranglerChild.on('exit', (code) => {
    console.log(`[dev-cf] Wrangler 进程已退出，code=${code}`)
    // 如果 wrangler 结束了，也结束整体进程（Next 随之退出）
    try { nextChild.kill() } catch {}
    process.exit(code ?? 0)
  })
  wranglerChild.on('error', (err) => {
    console.error('[dev-cf] 启动 Wrangler 失败:', err)
    try { nextChild.kill() } catch {}
    process.exit(1)
  })

  // 4) 进程信号联动处理
  const onSig = () => {
    try { wranglerChild.kill() } catch {}
    try { nextChild.kill() } catch {}
    process.exit(0)
  }
  process.on('SIGINT', onSig)
  process.on('SIGTERM', onSig)
}

main().catch((err) => {
  console.error('[dev-cf] 运行出错:', err)
  process.exit(1)
})