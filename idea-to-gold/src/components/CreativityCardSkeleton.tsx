// 创意卡片骨架屏组件
// 功能：在创意数据加载时显示骨架屏，提升用户体验
"use client";

import React from 'react';

interface CreativityCardSkeletonProps {
  count?: number; // 显示多少个骨架屏
}

const CreativityCardSkeleton: React.FC<CreativityCardSkeletonProps> = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          {/* 头部：作者信息和时间 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 头像骨架 */}
              <div className="h-8 w-8 rounded-full bg-gray-200"></div>
              {/* 作者名称骨架 */}
              <div className="h-4 w-20 rounded bg-gray-200"></div>
            </div>
            {/* 时间骨架 */}
            <div className="h-3 w-16 rounded bg-gray-200"></div>
          </div>

          {/* 标题骨架 */}
          <div className="mt-4 space-y-2">
            <div className="h-6 w-3/4 rounded bg-gray-200"></div>
            <div className="h-6 w-1/2 rounded bg-gray-200"></div>
          </div>

          {/* 描述骨架 */}
          <div className="mt-3 space-y-2">
            <div className="h-4 w-full rounded bg-gray-200"></div>
            <div className="h-4 w-5/6 rounded bg-gray-200"></div>
            <div className="h-4 w-2/3 rounded bg-gray-200"></div>
          </div>

          {/* 标签骨架 */}
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-12 rounded-full bg-gray-200"></div>
            <div className="h-6 w-16 rounded-full bg-gray-200"></div>
            <div className="h-6 w-14 rounded-full bg-gray-200"></div>
          </div>

          {/* 底部统计信息骨架 */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* 点赞数骨架 */}
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded bg-gray-200"></div>
                <div className="h-4 w-8 rounded bg-gray-200"></div>
              </div>
              {/* 评论数骨架 */}
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded bg-gray-200"></div>
                <div className="h-4 w-8 rounded bg-gray-200"></div>
              </div>
            </div>
            {/* 操作按钮骨架 */}
            <div className="h-8 w-20 rounded bg-gray-200"></div>
          </div>
        </div>
      ))}
    </>
  );
};

export default CreativityCardSkeleton;