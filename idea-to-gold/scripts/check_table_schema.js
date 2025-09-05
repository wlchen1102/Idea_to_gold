// 检查表结构的脚本
const { createClient } = require('@supabase/supabase-js');

// 从环境变量读取配置
const supabaseUrl = 'https://bkvbvmgcqfnxokklsxus.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdmJ2bWdjcWZueG9ra2xzeHVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc5MTE2MiwiZXhwIjoyMDcwMzY3MTYyfQ.YlqAV4KLt2utxz4_IBLA6iv-pXt_l3T_ChuexhK_8QQ';

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableSchema() {
  console.log('🔍 检查表结构...');
  
  try {
    // 查询creatives表的结构
    console.log('\n📋 creatives表结构:');
    const { data: creativesData, error: creativesError } = await supabase
      .from('creatives')
      .select('*')
      .limit(1);
    
    if (creativesError) {
      console.error('❌ 查询creatives表失败:', creativesError);
    } else if (creativesData && creativesData.length > 0) {
      const sample = creativesData[0];
      console.log('📝 字段类型示例:');
      Object.keys(sample).forEach(key => {
        const value = sample[key];
        const type = typeof value;
        const jsType = value === null ? 'null' : type;
        console.log(`  ${key}: ${jsType} (值: ${JSON.stringify(value)})`);
      });
    }
    
    // 查询profiles表的结构
    console.log('\n📋 profiles表结构:');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ 查询profiles表失败:', profilesError);
    } else if (profilesData && profilesData.length > 0) {
      const sample = profilesData[0];
      console.log('📝 字段类型示例:');
      Object.keys(sample).forEach(key => {
        const value = sample[key];
        const type = typeof value;
        const jsType = value === null ? 'null' : type;
        console.log(`  ${key}: ${jsType} (值: ${JSON.stringify(value)})`);
      });
    }
    
    // 查询creative_upvotes表的结构
    console.log('\n📋 creative_upvotes表结构:');
    const { data: upvotesData, error: upvotesError } = await supabase
      .from('creative_upvotes')
      .select('*')
      .limit(1);
    
    if (upvotesError) {
      console.error('❌ 查询creative_upvotes表失败:', upvotesError);
    } else if (upvotesData && upvotesData.length > 0) {
      const sample = upvotesData[0];
      console.log('📝 字段类型示例:');
      Object.keys(sample).forEach(key => {
        const value = sample[key];
        const type = typeof value;
        const jsType = value === null ? 'null' : type;
        console.log(`  ${key}: ${jsType} (值: ${JSON.stringify(value)})`);
      });
    }
    
    // 查询comments表的结构
    console.log('\n📋 comments表结构:');
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .limit(1);
    
    if (commentsError) {
      console.error('❌ 查询comments表失败:', commentsError);
    } else if (commentsData && commentsData.length > 0) {
      const sample = commentsData[0];
      console.log('📝 字段类型示例:');
      Object.keys(sample).forEach(key => {
        const value = sample[key];
        const type = typeof value;
        const jsType = value === null ? 'null' : type;
        console.log(`  ${key}: ${jsType} (值: ${JSON.stringify(value)})`);
      });
    }
    
  } catch (error) {
    console.error('💥 检查表结构出错:', error);
  }
}

// 执行检查
checkTableSchema().then(() => {
  console.log('\n🏁 检查完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 检查失败:', error);
  process.exit(1);
});