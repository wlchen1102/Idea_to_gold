/**
 * 创意详情页面的骨架屏组件
 * 可复用的加载状态组件，提供结构化的加载体验
 */
export default function CreativeDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* 主要内容区域骨架 */}
      <section className="md:col-span-2">
        {/* 标题骨架 */}
        <div className="animate-pulse">
          <div className="h-9 bg-gray-200 rounded-lg w-3/4 mb-3"></div>
        </div>
        
        {/* 作者信息骨架 */}
        <div className="mt-3 flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>

        {/* 创意描述标题骨架 */}
        <div className="mt-6 flex items-center justify-between animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-24"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
        
        {/* 描述内容骨架 */}
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 md:p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </section>

      {/* 右侧信息栏骨架 */}
      <aside className="md:col-span-1">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="animate-pulse space-y-4">
            {/* 支持者数量骨架 */}
            <div>
              <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
            
            {/* 平台标签骨架 */}
            <div>
              <div className="h-4 bg-gray-200 rounded w-12 mb-2"></div>
              <div className="flex gap-2">
                <div className="h-6 bg-gray-200 rounded-full w-12"></div>
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              </div>
            </div>
            
            {/* 悬赏金额骨架 */}
            <div>
              <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
            
            {/* 按钮骨架 */}
            <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
          </div>
        </div>
      </aside>
      
      {/* 评论区域骨架 */}
      <section className="md:col-span-2">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-20 mb-4"></div>
          
          {/* 评论输入框骨架 */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 mb-6">
            <div className="h-20 bg-gray-200 rounded w-full mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
          
          {/* 评论列表骨架 */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * 简化版的创意详情骨架屏
 * 用于快速加载场景
 */
export function SimpleCreativeDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* 标题骨架 */}
      <div className="h-9 bg-gray-200 rounded-lg w-3/4"></div>
      
      {/* 作者信息骨架 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
      
      {/* 内容骨架 */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/5"></div>
      </div>
    </div>
  );
}