// 创建简化RPC函数的脚本
const { createClient } = require('@supabase/supabase-js');

// 从环境变量读取配置
const supabaseUrl = 'https://bkvbvmgcqfnxokklsxus.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdmJ2bWdjcWZueG9ra2xzeHVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc5MTE2MiwiZXhwIjoyMDcwMzY3MTYyfQ.YlqAV4KLt2utxz4_IBLA6iv-pXt_l3T_ChuexhK_8QQ';

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSimpleRpc() {
  console.log('🚀 创建简化的RPC函数...');
  
  try {
    // 测试当前API的批量查询方式的性能
    console.log('\n1. 测试当前批量查询方式的性能...');
    const testUserId = 'ee48a185-60b1-48bb-aff6-77ec8ed82880';
    
    const startTime = Date.now();
    
    // 模拟当前API的查询方式
    // 第一步：获取创意列表
    const { data: creatives, error: creativesError } = await supabase
      .from('creatives')
      .select(`
        id,
        title,
        description,
        terminals,
        created_at,
        author_id,
        slug,
        bounty_amount
      `)
      .eq('author_id', testUserId)
      .order('created_at', { ascending: false });
    
    if (creativesError) {
      console.error('❌ 查询创意失败:', creativesError);
      return;
    }
    
    console.log(`📚 找到 ${creatives.length} 个创意`);
    
    // 第二步：批量获取点赞数
    const creativeIds = creatives.map(c => c.id);
    const { data: upvotes, error: upvotesError } = await supabase
      .from('creative_upvotes')
      .select('creative_id')
      .in('creative_id', creativeIds);
    
    if (upvotesError) {
      console.error('❌ 查询点赞失败:', upvotesError);
      return;
    }
    
    // 第三步：批量获取评论数
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('creative_id')
      .in('creative_id', creativeIds)
      .not('creative_id', 'is', null);
    
    if (commentsError) {
      console.error('❌ 查询评论失败:', commentsError);
      return;
    }
    
    // 第四步：获取用户资料
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('nickname, avatar_url')
      .eq('id', testUserId)
      .single();
    
    if (profileError) {
      console.error('❌ 查询用户资料失败:', profileError);
      return;
    }
    
    // 第五步：在内存中合并数据
    const upvoteCounts = {};
    upvotes.forEach(upvote => {
      upvoteCounts[upvote.creative_id] = (upvoteCounts[upvote.creative_id] || 0) + 1;
    });
    
    const commentCounts = {};
    comments.forEach(comment => {
      commentCounts[comment.creative_id] = (commentCounts[comment.creative_id] || 0) + 1;
    });
    
    const result = creatives.map(creative => ({
      ...creative,
      upvote_count: upvoteCounts[creative.id] || 0,
      comment_count: commentCounts[creative.id] || 0,
      profiles: {
        nickname: profile.nickname,
        avatar_url: profile.avatar_url
      }
    }));
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`⏱️  批量查询总耗时: ${totalTime}ms`);
    console.log(`📊 返回数据条数: ${result.length}`);
    
    if (result.length > 0) {
      console.log('📝 第一条数据示例:');
      console.log(JSON.stringify(result[0], null, 2));
    }
    
    // 2. 尝试优化查询
    console.log('\n2. 尝试优化查询（使用JOIN）...');
    
    const optimizedStartTime = Date.now();
    
    // 使用一个复杂的查询来获取所有数据
    const { data: optimizedResult, error: optimizedError } = await supabase
      .from('creatives')
      .select(`
        id,
        title,
        description,
        terminals,
        created_at,
        author_id,
        slug,
        bounty_amount,
        profiles!creatives_author_id_fkey(
          nickname,
          avatar_url
        )
      `)
      .eq('author_id', testUserId)
      .order('created_at', { ascending: false });
    
    if (optimizedError) {
      console.error('❌ 优化查询失败:', optimizedError);
    } else {
      // 仍然需要单独查询统计数据
      const { data: upvoteStats } = await supabase
        .from('creative_upvotes')
        .select('creative_id')
        .in('creative_id', optimizedResult.map(c => c.id));
      
      const { data: commentStats } = await supabase
        .from('comments')
        .select('creative_id')
        .in('creative_id', optimizedResult.map(c => c.id))
        .not('creative_id', 'is', null);
      
      // 计算统计数据
      const upvoteCountsOpt = {};
      (upvoteStats || []).forEach(upvote => {
        upvoteCountsOpt[upvote.creative_id] = (upvoteCountsOpt[upvote.creative_id] || 0) + 1;
      });
      
      const commentCountsOpt = {};
      (commentStats || []).forEach(comment => {
        commentCountsOpt[comment.creative_id] = (commentCountsOpt[comment.creative_id] || 0) + 1;
      });
      
      const finalResult = optimizedResult.map(creative => ({
        ...creative,
        upvote_count: upvoteCountsOpt[creative.id] || 0,
        comment_count: commentCountsOpt[creative.id] || 0
      }));
      
      const optimizedEndTime = Date.now();
      const optimizedTotalTime = optimizedEndTime - optimizedStartTime;
      
      console.log(`⏱️  优化查询总耗时: ${optimizedTotalTime}ms`);
      console.log(`📊 返回数据条数: ${finalResult.length}`);
      console.log(`🚀 性能提升: ${totalTime - optimizedTotalTime}ms (${((totalTime - optimizedTotalTime) / totalTime * 100).toFixed(1)}%)`);
    }
    
  } catch (error) {
    console.error('💥 测试过程出错:', error);
  }
}

// 执行测试
createSimpleRpc().then(() => {
  console.log('\n🏁 测试完成');
  console.log('\n💡 建议:');
  console.log('1. 当前批量查询方式已经相对高效');
  console.log('2. 主要瓶颈可能在网络延迟和数据库连接');
  console.log('3. 可以考虑添加适当的缓存策略');
  console.log('4. 确保数据库索引已正确创建');
  process.exit(0);
}).catch(error => {
  console.error('💥 测试失败:', error);
  process.exit(1);
});