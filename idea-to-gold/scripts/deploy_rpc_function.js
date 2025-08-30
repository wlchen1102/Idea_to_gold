// 部署RPC函数的脚本
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 从环境变量读取配置
const supabaseUrl = 'https://bkvbvmgcqfnxokklsxus.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdmJ2bWdjcWZueG9ra2xzeHVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc5MTE2MiwiZXhwIjoyMDcwMzY3MTYyfQ.YlqAV4KLt2utxz4_IBLA6iv-pXt_l3T_ChuexhK_8QQ';

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployRpcFunction() {
  console.log('🚀 开始部署RPC函数...');
  
  try {
    // 1. 删除现有函数（如果存在）
    console.log('\n1. 删除现有函数...');
    const dropSql = `
      DROP FUNCTION IF EXISTS get_user_creatives_with_counts(UUID) CASCADE;
      DROP FUNCTION IF EXISTS get_user_creatives_with_counts CASCADE;
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropSql });
    if (dropError) {
      console.log('⚠️  删除函数时出现警告（可能函数不存在）:', dropError.message);
    } else {
      console.log('✅ 成功删除现有函数');
    }
    
    // 2. 创建新的RPC函数
    console.log('\n2. 创建新的RPC函数...');
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION get_user_creatives_with_counts(
        user_uuid UUID
      )
      RETURNS TABLE (
        id UUID,
        title TEXT,
        description TEXT,
        terminals TEXT[],
        created_at TIMESTAMPTZ,
        author_id UUID,
        slug TEXT,
        upvote_count BIGINT,
        comment_count BIGINT,
        bounty_amount NUMERIC,
        profiles JSONB
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          c.id,
          c.title,
          c.description,
          c.terminals,
          c.created_at,
          c.author_id,
          c.slug,
          COALESCE(upvote_stats.upvote_count, 0) AS upvote_count,
          COALESCE(comment_stats.comment_count, 0) AS comment_count,
          c.bounty_amount,
          jsonb_build_object(
            'nickname', p.nickname,
            'avatar_url', p.avatar_url
          ) AS profiles
        FROM creatives c
        LEFT JOIN profiles p ON c.author_id = p.id
        LEFT JOIN (
          SELECT 
            cu.creative_id,
            COUNT(*) AS upvote_count
          FROM creative_upvotes cu
          GROUP BY cu.creative_id
        ) upvote_stats ON c.id = upvote_stats.creative_id
        LEFT JOIN (
          SELECT 
            cm.creative_id,
            COUNT(*) AS comment_count
          FROM comments cm
          WHERE cm.creative_id IS NOT NULL
          GROUP BY cm.creative_id
        ) comment_stats ON c.id = comment_stats.creative_id
        WHERE c.author_id = user_uuid
        ORDER BY c.created_at DESC;
      END;
      $$;
    `;
    
    // 尝试直接执行SQL（如果Supabase支持）
    try {
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createFunctionSql });
      if (createError) {
        throw createError;
      }
      console.log('✅ 成功创建RPC函数');
    } catch (execError) {
      console.log('⚠️  直接执行SQL失败，尝试分步创建...');
      
      // 如果直接执行失败，尝试使用Supabase的SQL执行功能
      // 这里我们输出SQL语句，用户需要手动在Supabase SQL编辑器中执行
      console.log('\n📋 请在Supabase SQL编辑器中执行以下SQL:');
      console.log('=' .repeat(80));
      console.log(createFunctionSql);
      console.log('=' .repeat(80));
    }
    
    // 3. 创建索引
    console.log('\n3. 创建优化索引...');
    const indexSqls = [
      'CREATE INDEX IF NOT EXISTS idx_creatives_author_created_desc ON creatives (author_id, created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_creative_upvotes_creative_id ON creative_upvotes (creative_id);',
      'CREATE INDEX IF NOT EXISTS idx_comments_creative_id_stats ON comments (creative_id) WHERE creative_id IS NOT NULL;',
      'CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles (id);'
    ];
    
    for (const indexSql of indexSqls) {
      try {
        const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSql });
        if (indexError) {
          console.log(`⚠️  创建索引时出现警告: ${indexError.message}`);
        } else {
          console.log(`✅ 成功创建索引`);
        }
      } catch (error) {
        console.log(`⚠️  索引创建失败: ${error.message}`);
      }
    }
    
    // 4. 测试RPC函数
    console.log('\n4. 测试RPC函数...');
    const testUserId = 'ee48a185-60b1-48bb-aff6-77ec8ed82880';
    
    const startTime = Date.now();
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_user_creatives_with_counts', { user_uuid: testUserId });
    const endTime = Date.now();
    
    if (rpcError) {
      console.error('❌ RPC函数测试失败:', rpcError);
      console.log('\n🔧 请手动在Supabase SQL编辑器中执行上述SQL语句');
    } else {
      console.log('✅ RPC函数测试成功!');
      console.log(`⏱️  执行时间: ${endTime - startTime}ms`);
      console.log(`📊 返回数据条数: ${rpcResult ? rpcResult.length : 0}`);
      
      if (rpcResult && rpcResult.length > 0) {
        console.log('📝 第一条数据示例:');
        console.log(JSON.stringify(rpcResult[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('💥 部署过程出错:', error);
  }
}

// 执行部署
deployRpcFunction().then(() => {
  console.log('\n🏁 部署完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 部署失败:', error);
  process.exit(1);
});