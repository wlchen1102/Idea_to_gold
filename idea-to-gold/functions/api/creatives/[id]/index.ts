import { createClient } from '@supabase/supabase-js'
import type { CloudflareContext, CreativeResponse, Creative } from '../../../types'

// GET /api/creatives/:id 获取单个创意
export async function onRequestGet(context: CloudflareContext): Promise<Response> {
  try {
    const supabaseUrl = context.env?.SUPABASE_URL
    const serviceRoleKey = context.env?.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ message: '服务端环境变量未配置' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const id = context.params?.id
    if (!id || typeof id !== 'string') {
      return new Response(
        JSON.stringify({ message: '缺少或非法的参数：id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { global: { fetch } })

    const { data, error } = await supabase
      .from('user_creatives')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return new Response(
        JSON.stringify({ message: '查询创意失败', error: error.message } satisfies Partial<CreativeResponse>),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!data) {
      return new Response(
        JSON.stringify({ message: '未找到资源' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const creative = data as unknown as Creative

    return new Response(
      JSON.stringify({ message: '获取创意成功', creative } satisfies CreativeResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    const msg = (e instanceof Error && e.message) ? e.message : 'unknown error'
    return new Response(JSON.stringify({ message: '服务器内部错误', error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}