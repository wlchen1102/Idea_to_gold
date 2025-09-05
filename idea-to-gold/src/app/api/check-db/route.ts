// 临时 API：检查 comment_likes 表的数据库状态
// 作用：用于在本地开发环境绕过 Supabase SQL Editor 网络问题，检查 comment_likes 的列、主键、唯一约束、索引、外键与 RLS 状态
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminEnvVars } from '@/lib/env'

export const runtime = 'edge'

export async function GET(_request: NextRequest) {
  try {
    const { supabaseUrl, serviceRoleKey } = getAdminEnvVars()
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    })

    // 0. 访问性与统计信息（不依赖 exec_sql）
    const { error: probeError } = await supabase.from('comment_likes').select('id').limit(1)
    if (probeError) {
      return Response.json({
        success: false,
        table_accessible: false,
        message: 'comment_likes 表不存在或无法访问',
        details: probeError.message
      }, { status: 500 })
    }

    const { count: likeCount, error: countError } = await supabase
      .from('comment_likes')
      .select('id', { count: 'exact', head: true })

    if (countError) {
      return Response.json({
        success: false,
        table_accessible: true,
        message: '无法统计 comment_likes 行数',
        details: countError.message
      }, { status: 500 })
    }

    // 1. 探测 exec_sql RPC 是否存在
    const execSqlProbe = await supabase.rpc('exec_sql', { sql: 'select 1' })
    const hasExecSql = !execSqlProbe.error

    if (!hasExecSql) {
      // 当 exec_sql 不存在时，返回基础信息 + 下一步指引（提供创建 exec_sql 的 SQL）
      const createExecSql = `-- 可选：创建一个仅供服务端使用的通用执行函数，便于结构体检
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;`

      return Response.json({
        success: true,
        table_accessible: true,
        row_count: likeCount ?? 0,
        exec_sql_available: false,
        next_step: '当前环境缺少 exec_sql RPC，无法直接查询信息架构。请暂时在 Supabase SQL Editor 或 psql 中创建 exec_sql，再调用此接口获取完整结构。',
        helper_sql: createExecSql
      })
    }

    // 2. 结构化体检查询（依赖 exec_sql）
    const structureQueries = [
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'comment_likes'
       ORDER BY ordinal_position`,
      `SELECT c.column_name, c.data_type
       FROM information_schema.table_constraints tc
       JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
       JOIN information_schema.columns c ON ccu.column_name = c.column_name AND ccu.table_name = c.table_name
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema = 'public'
         AND tc.table_name = 'comment_likes'`,
      `SELECT tc.constraint_name, ccu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
       WHERE tc.constraint_type = 'UNIQUE'
         AND tc.table_schema = 'public'
         AND tc.table_name = 'comment_likes'`,
      `SELECT 
         tc.constraint_name,
         kcu.column_name as source_column,
         ccu.table_name as target_table,
         ccu.column_name as target_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
       JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = 'public'
         AND tc.table_name = 'comment_likes'`,
      `SELECT 
         i.relname as index_name,
         am.amname as index_type,
         ix.indisunique as is_unique,
         ix.indisprimary as is_primary,
         array_to_string(array_agg(a.attname ORDER BY a.attnum), ', ') as columns
       FROM pg_class t
       JOIN pg_index ix ON t.oid = ix.indrelid
       JOIN pg_class i ON i.oid = ix.indexrelid
       JOIN pg_am am ON i.relam = am.oid
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
       WHERE t.relname = 'comment_likes'
         AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
       GROUP BY i.relname, am.amname, ix.indisunique, ix.indisprimary
       ORDER BY i.relname`,
      `SELECT 
         schemaname,
         tablename,
         rowsecurity as rls_enabled,
         (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comment_likes') as policy_count
       FROM pg_tables
       WHERE schemaname = 'public' AND tablename = 'comment_likes'`
    ]

    const results: Record<string, unknown> = {}
    const queryNames = ['columns', 'primary_key', 'unique_constraints', 'foreign_keys', 'indexes', 'rls_status']

    for (let i = 0; i < structureQueries.length; i++) {
      const { data, error } = await supabase.rpc('exec_sql', { sql: structureQueries[i] })
      if (error) {
        results[queryNames[i]] = { error: error.message }
      } else {
        results[queryNames[i]] = data ?? []
      }
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      table_accessible: true,
      row_count: likeCount ?? 0,
      exec_sql_available: true,
      structure_analysis: results,
      recommendation: {
        message: '根据检查结果，我们可以判断是否需要执行脚本 B（加固）',
        next_steps: [
          '查看主键设置（应该是 id uuid）',
          '确认唯一约束（应该有 comment_id, user_id 联合唯一约束）',
          '检查外键约束（应该有指向 comments 和 profiles 的外键）',
          '验证索引完整性（需要性能优化索引）',
          '确认 RLS 策略数量'
        ]
      }
    })

  } catch (error) {
    return Response.json({
      error: '检查数据库状态失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}