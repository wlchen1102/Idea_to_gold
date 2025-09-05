// 测试个人中心创意API性能
const fetch = require('node-fetch');

// 测试配置
const API_BASE_URL = 'http://127.0.0.1:8788';
const TEST_USER_ID = 'ee48a185-60b1-48bb-aff6-77ec8ed82880';
const TEST_ITERATIONS = 5;

// 模拟认证token（实际应用中应该通过登录获取）
const MOCK_TOKEN = 'mock-token-for-testing';

async function testCreativesAPI() {
  console.log('🚀 开始测试个人中心创意API性能...');
  console.log(`测试用户ID: ${TEST_USER_ID}`);
  console.log(`测试次数: ${TEST_ITERATIONS}`);
  console.log('=' .repeat(50));

  const results = [];

  for (let i = 1; i <= TEST_ITERATIONS; i++) {
    console.log(`\n📊 第 ${i} 次测试:`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${TEST_USER_ID}/creatives`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${MOCK_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Performance-Test-Script'
        }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.ok) {
        const data = await response.json();
        const creativesCount = data.creatives ? data.creatives.length : 0;
        
        console.log(`   ✅ 状态: ${response.status} ${response.statusText}`);
        console.log(`   ⏱️  响应时间: ${responseTime}ms`);
        console.log(`   📝 创意数量: ${creativesCount}`);
        console.log(`   📊 数据大小: ${JSON.stringify(data).length} 字符`);
        
        // 检查响应头，看是否有缓存信息
        const cacheControl = response.headers.get('cache-control');
        if (cacheControl) {
          console.log(`   🗄️  缓存策略: ${cacheControl}`);
        }
        
        results.push({
          iteration: i,
          responseTime,
          status: response.status,
          creativesCount,
          dataSize: JSON.stringify(data).length,
          success: true
        });
        
      } else {
        console.log(`   ❌ 错误: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log(`   📄 错误详情: ${errorText}`);
        
        results.push({
          iteration: i,
          responseTime,
          status: response.status,
          success: false,
          error: errorText
        });
      }
      
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`   💥 网络错误: ${error.message}`);
      
      results.push({
        iteration: i,
        responseTime,
        success: false,
        error: error.message
      });
    }
    
    // 在测试之间稍作停顿
    if (i < TEST_ITERATIONS) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 分析结果
  console.log('\n' + '=' .repeat(50));
  console.log('📈 性能分析结果:');
  console.log('=' .repeat(50));
  
  const successfulResults = results.filter(r => r.success);
  
  if (successfulResults.length === 0) {
    console.log('❌ 所有测试都失败了！');
    return;
  }
  
  const responseTimes = successfulResults.map(r => r.responseTime);
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const minResponseTime = Math.min(...responseTimes);
  const maxResponseTime = Math.max(...responseTimes);
  
  console.log(`✅ 成功测试: ${successfulResults.length}/${TEST_ITERATIONS}`);
  console.log(`⏱️  平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`🚀 最快响应时间: ${minResponseTime}ms`);
  console.log(`🐌 最慢响应时间: ${maxResponseTime}ms`);
  
  // 性能评估
  let performanceRating;
  if (avgResponseTime < 500) {
    performanceRating = '🟢 优秀 (< 500ms)';
  } else if (avgResponseTime < 1000) {
    performanceRating = '🟡 良好 (500ms - 1s)';
  } else if (avgResponseTime < 2000) {
    performanceRating = '🟠 一般 (1s - 2s)';
  } else {
    performanceRating = '🔴 需要优化 (> 2s)';
  }
  
  console.log(`🎯 性能评级: ${performanceRating}`);
  
  // 检查是否达到目标性能
  if (avgResponseTime <= 500) {
    console.log('\n🎉 恭喜！API性能已达到目标 (≤ 500ms)');
  } else {
    console.log(`\n⚠️  API性能仍需优化，目标是500ms以内，当前平均${avgResponseTime.toFixed(2)}ms`);
    
    if (avgResponseTime > 2000) {
      console.log('💡 建议检查:');
      console.log('   1. RPC函数是否正确部署');
      console.log('   2. 数据库索引是否生效');
      console.log('   3. 是否存在N+1查询问题');
    }
  }
  
  console.log('\n📋 详细结果:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} 测试${result.iteration}: ${result.responseTime}ms ${result.success ? `(${result.creativesCount}个创意)` : `(${result.error})`}`);
  });
}

// 运行测试
if (require.main === module) {
  testCreativesAPI().catch(console.error);
}

module.exports = { testCreativesAPI };