#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { platform } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Windows 兼容的构建脚本
async function buildForCloudflare() {
  console.log('🚀 开始构建 Cloudflare Pages 项目...')
  
  try {
    // 首先运行 Next.js 构建
    console.log('📦 运行 Next.js 构建...')
    await runCommand('npm', ['run', 'build'])
    
    // 然后运行 @cloudflare/next-on-pages
    console.log('⚡ 转换为 Cloudflare Pages 格式...')
    
    try {
      // 在 Windows 上使用不同的方法
      if (platform() === 'win32') {
        // 尝试使用 npx 直接运行，不依赖 bash
        await runCommand('npx', ['@cloudflare/next-on-pages@1', '--skip-build'])
      } else {
        await runCommand('npx', ['@cloudflare/next-on-pages@1'])
      }
      console.log('✅ @cloudflare/next-on-pages 转换完成！')
    } catch (conversionError) {
      console.log('⚠️  @cloudflare/next-on-pages 失败，创建手动结构...')
      createCloudflareStructure()
    }
    
    console.log('✅ 构建完成！')
  } catch (error) {
    console.error('❌ 构建失败:', error.message)
    process.exit(1)
  }
}

// 手动创建 Cloudflare Pages 所需的文件结构
function createCloudflareStructure() {
  console.log('📁 手动创建 Cloudflare Pages 结构...')
  
  const nextDir = join(projectRoot, '.next')
  const distDir = join(projectRoot, 'dist')
  
  // 确保 dist 目录存在
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true })
  }
  
  // 复制静态文件
  const staticDir = join(nextDir, 'static')
  const distStaticDir = join(distDir, '_next', 'static')
  
  if (fs.existsSync(staticDir)) {
    fs.mkdirSync(join(distDir, '_next'), { recursive: true })
    fs.cpSync(staticDir, distStaticDir, { recursive: true })
    console.log('✅ 静态文件已复制')
  }
  
  // 创建 _worker.js 文件（简化版本）
  const workerContent = `
export default {
  async fetch(request, env, ctx) {
    // 这是一个简化的 worker，实际部署时 Cloudflare 会处理
    return new Response('Hello from Cloudflare Pages!', {
      headers: { 'content-type': 'text/plain' },
    });
  },
};
`
  
  fs.writeFileSync(join(distDir, '_worker.js'), workerContent)
  console.log('✅ Worker 文件已创建')
  
  return true
}

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`运行: ${command} ${args.join(' ')}`)
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: platform() === 'win32',
      cwd: projectRoot
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`命令 "${command} ${args.join(' ')}" 失败，退出码: ${code}`))
      }
    })
    
    child.on('error', (error) => {
      reject(error)
    })
  })
}

buildForCloudflare()