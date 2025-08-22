import { NextRequest, NextResponse } from 'next/server'

// 使用 Edge Runtime
export const runtime = 'edge'

// POST - 设置登录状态 Cookie
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null) as { userId?: string } | null
    const userId = body?.userId
    
    if (!userId) {
      return NextResponse.json({ message: '缺少必填字段：userId' }, { status: 400 })
    }

    // 创建响应并设置 HttpOnly Cookie
    const response = NextResponse.json({ message: '登录状态已设置' }, { status: 200 })
    
    // 设置 HttpOnly Cookie，有效期30天
    // secure: true 仅在生产环境 HTTPS 下使用，开发环境自动false
    response.cookies.set('user-session', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30天（秒）
      path: '/'
    })
    
    return response
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}

// DELETE - 清除登录状态 Cookie
export async function DELETE(): Promise<NextResponse> {
  try {
    const response = NextResponse.json({ message: '登录状态已清除' }, { status: 200 })
    
    // 清除 Cookie
    response.cookies.set('user-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // 立即过期
      path: '/'
    })
    
    return response
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}