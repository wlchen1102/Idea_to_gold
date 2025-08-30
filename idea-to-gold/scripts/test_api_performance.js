// 测试API性能的脚本
const { createClient } = require('@supabase/supabase-js');

// 从环境变量读取配置
const supabaseUrl = 'https://bkvbvmgcqfnxokklsxus.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdmJ2bWdjcWZueG9ra2xzeHVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3OTExNjIsImV4cCI6MjA3MDM2NzE2Mn0.uNkB5g0owHKEumiPDzek1K0ZaSDdIJhPT6FwHh0hmJ0';

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testApiPerformance() {
  console.log('🚀 开始测试API性能...');
  
  try {
    // 直接使用已知的用户ID和模拟token进行测试
    console.log('\n1. 使用已知用户ID进行测试...');
    const userId = 'ee48a185-60b1-48bb-aff6-77ec8ed82880';
    
    // 创建一个临时的认证token用于测试
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    
    if (authError || !authData.session) {
      console.error('❌ 获取临时token失败:', authError);
      // 如果匿名登录也失败，我们直接测试API而不使用认证
      console.log('⚠️  将在不使用认证的情况下测试API');
    }
    
    const token = authData?.session?.access_token || 'test-token';
    console.log(`✅ 准备测试，用户ID: ${userId}`);
    
    // 2. 测试API性能
    console.log('\n2. 测试API性能...');
    const apiUrl = `http://127.0.0.1:8788/api/users/${userId}/creatives`;
    
    // 进行多次测试以获得平均值
    const testRounds = 3;
    const times = [];
    
    for (let i = 1; i <= testRounds; i++) {
      console.log(`\n📊 第 ${i} 轮测试:`);
      const startTime = Date.now();
      
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        times.push(responseTime);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ 响应时间: ${responseTime}ms`);
          console.log(`   📚 返回创意数量: ${data.creatives?.length || 0}`);
          console.log(`   📊 总数: ${data.total || 0}`);
          
          if (i === 1 && data.creatives && data.creatives.length > 0) {
            console.log('   📝 第一条数据结构:');
            const firstCreative = data.creatives[0];
            console.log(`      - ID: ${firstCreative.id}`);
            console.log(`      - 标题: ${firstCreative.title}`);
            console.log(`      - 点赞数: ${firstCreative.upvote_count}`);
            console.log(`      - 评论数: ${firstCreative.comment_count}`);
            console.log(`      - 作者昵称: ${firstCreative.profiles?.nickname || 'N/A'}`);
          }
        } else {
          console.log(`   ❌ 请求失败: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.log(`   错误详情: ${errorText}`);
        }
      } catch (error) {
        console.error(`   💥 请求异常:`, error.message);
      }
      
      // 在测试之间稍作延迟
      if (i < testRounds) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 3. 计算统计数据
    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log('\n📈 性能统计:');
      console.log(`   平均响应时间: ${avgTime.toFixed(2)}ms`);
      console.log(`   最快响应时间: ${minTime}ms`);
      console.log(`   最慢响应时间: ${maxTime}ms`);
      console.log(`   所有测试时间: [${times.join(', ')}]ms`);
      
      // 性能评估
      if (avgTime < 1000) {
        console.log('   🎉 性能优秀！响应时间在1秒以内');
      } else if (avgTime < 2000) {
        console.log('   ✅ 性能良好，响应时间在2秒以内');
      } else if (avgTime < 5000) {
        console.log('   ⚠️  性能一般，响应时间在5秒以内');
      } else {
        console.log('   ❌ 性能较差，响应时间超过5秒');
      }
    }
    
  } catch (error) {
    console.error('💥 测试过程出错:', error);
  }
}

// 执行测试
testApiPerformance().then(() => {
  console.log('\n🏁 测试完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 测试失败:', error);
  process.exit(1);
});