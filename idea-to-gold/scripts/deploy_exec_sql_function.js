// 部署 exec_sql RPC 函数脚本
// 作用：创建 exec_sql 函数，用于执行任意 SQL 查询，主要用于表结构检查
const { createClient } = require('@supabase/supabase-js');

// 从环境变量读取配置（与其他脚本保持一致）
const supabaseUrl = 'https://bkvbvmgcqfnxokklsxus.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdmJ2bWdjcWZueG9ra2xzeHVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc5MTE2MiwiZXhwIjoyMDcwMzY3MTYyfQ.YlqAV4KLt2utxz4_IBLA6iv-pXt_l3T_ChuexhK_8QQ';

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployExecSqlFunction() {
  console.log('🚀 开始部署 exec_sql RPC 函数...\n');
  
  try {
    // 1. 检查当前函数是否存在
    console.log('1️⃣ 检查现有 exec_sql 函数...');
    const { error: testError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1 as test' });
    
    if (!testError) {
      console.log('✅ exec_sql 函数已存在，无需重复创建');
      console.log('💡 如需重新创建，请先手动删除现有函数\n');
      return;
    }
    
    console.log('⚠️ exec_sql 函数不存在，开始创建...\n');
    
    // 2. 创建 exec_sql 函数的 SQL
    console.log('2️⃣ 准备 SQL 语句...');
    const createExecSqlSql = `
      -- 创建 exec_sql 函数，用于执行任意 SQL 查询
      CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
      RETURNS TABLE(result JSONB)
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        rec RECORD;
        result_array JSONB[] := '{}';
        row_json JSONB;
      BEGIN
        -- 执行传入的 SQL 并将结果转换为 JSONB 数组
        FOR rec IN EXECUTE sql LOOP
          row_json := to_jsonb(rec);
          result_array := result_array || row_json;
        END LOOP;
        
        -- 返回结果数组中的每个元素
        FOR i IN 1..array_length(result_array, 1) LOOP
          result := result_array[i];
          RETURN NEXT;
        END LOOP;
        
        RETURN;
      END;
      $$;
    `;
    
    console.log('📋 生成的 SQL 语句:');
    console.log('=' .repeat(80));
    console.log(createExecSqlSql);
    console.log('=' .repeat(80));
    
    // 3. 由于我们无法直接执行 DDL，输出指导信息
    console.log('\n3️⃣ 部署说明:');
    console.log('');
    console.log('📍 请按以下步骤操作:');
    console.log('');
    console.log('步骤 1: 打开 Supabase 控制台');
    console.log('   - 访问: https://supabase.com/dashboard');
    console.log('   - 选择你的项目');
    console.log('');
    console.log('步骤 2: 进入 SQL Editor');
    console.log('   - 点击左侧导航栏的 "SQL Editor"');
    console.log('   - 点击 "New query" 创建新查询');
    console.log('');
    console.log('步骤 3: 执行 SQL');
    console.log('   - 将上述 SQL 语句复制粘贴到编辑器中');
    console.log('   - 点击 "Run" 按钮执行');
    console.log('');
    console.log('步骤 4: 验证创建成功');
    console.log('   - 执行完成后，运行以下测试 SQL:');
    console.log('     SELECT * FROM exec_sql(\'SELECT 1 as test\')');
    console.log('   - 如果返回 {"test": 1}，说明函数创建成功');
    console.log('');
    
    // 4. 保存 SQL 到文件，便于复制
    const fs = require('fs');
    const sqlFilePath = 'deploy_exec_sql.sql';
    fs.writeFileSync(sqlFilePath, createExecSqlSql.trim());
    console.log(`💾 SQL 已保存到文件: ${sqlFilePath}`);
    console.log('   你可以直接从文件复制 SQL 内容');
    console.log('');
    
    // 5. 提供简化的测试验证
    console.log('5️⃣ 部署后验证:');
    console.log('');
    console.log('完成上述步骤后，请运行以下命令验证:');
    console.log('   node scripts/check_comment_likes_table.js');
    console.log('');
    console.log('如果看到 "✅ exec_sql RPC 可用，开始详细结构检查..."');
    console.log('则说明部署成功，将获得完整的表结构分析报告');
    
  } catch (error) {
    console.error('💥 部署准备过程出错:', error.message);
  }
}

// 执行部署准备
deployExecSqlFunction().then(() => {
  console.log('\n🏁 部署准备完成');
  console.log('\n🎯 下一步：按照上述说明在 Supabase SQL Editor 中创建函数');
  process.exit(0);
}).catch(error => {
  console.error('💥 部署准备失败:', error);
  process.exit(1);
});