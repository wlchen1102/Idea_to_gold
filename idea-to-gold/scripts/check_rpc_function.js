// 检查RPC函数状态的脚本
const { createClient } = require('@supabase/supabase-js');

// 从环境变量读取配置
const supabaseUrl = 'https://bkvbvmgcqfnxokklsxus.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdmJ2bWdjcWZueG9ra2xzeHVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc5MTE2MiwiZXhwIjoyMDcwMzY3MTYyfQ.YlqAV4KLt2utxz4_IBLA6iv-pXt_l3T_ChuexhK_8QQ';

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRpcFunction() {
  console.log('🔍 检查RPC函数状态...');
  
  try {
    // 1. 检查RPC函数是否存在
    console.log('\n1. 检查RPC函数是否存在:');
    const { data: routines, error: routinesError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type, data_type')
      .eq('routine_name', 'get_user_creatives_with_counts')
      .eq('routine_schema', 'public');
    
    if (routinesError) {
      console.error('❌ 查询RPC函数失败:', routinesError);
    } else {
      console.log('📋 RPC函数查询结果:', routines);
      if (routines && routines.length > 0) {
        console.log('✅ RPC函数存在');
      } else {
        console.log('❌ RPC函数不存在');
      }
    }
    
    // 2. 尝试调用RPC函数
    console.log('\n2. 尝试调用RPC函数:');
    const testUserId = 'ee48a185-60b1-48bb-aff6-77ec8ed82880';
    
    const startTime = Date.now();
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_user_creatives_with_counts', { user_id: testUserId });
    const endTime = Date.now();
    
    if (rpcError) {
      console.error('❌ RPC函数调用失败:', rpcError);
      console.log('🔧 这解释了为什么API回退到批量查询方式');
    } else {
      console.log('✅ RPC函数调用成功');
      console.log(`⏱️  RPC函数执行时间: ${endTime - startTime}ms`);
      console.log(`📊 返回数据条数: ${rpcResult ? rpcResult.length : 0}`);
      if (rpcResult && rpcResult.length > 0) {
        console.log('📝 第一条数据示例:', JSON.stringify(rpcResult[0], null, 2));
      }
    }
    
    // 3. 检查相关表的数据量
    console.log('\n3. 检查相关表的数据量:');
    
    const { count: creativesCount } = await supabase
      .from('creatives')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', testUserId);
    console.log(`📚 用户创意数量: ${creativesCount}`);
    
    const { count: upvotesCount } = await supabase
      .from('creative_upvotes')
      .select('*', { count: 'exact', head: true });
    console.log(`👍 总点赞数量: ${upvotesCount}`);
    
    const { count: commentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .not('creative_id', 'is', null);
    console.log(`💬 总评论数量: ${commentsCount}`);
    
  } catch (error) {
    console.error('💥 脚本执行出错:', error);
  }
}

// 执行检查
checkRpcFunction().then(() => {
  console.log('\n🏁 检查完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 脚本执行失败:', error);
  process.exit(1);
});