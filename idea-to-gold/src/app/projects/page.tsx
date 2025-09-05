// 产品广场（/projects）：展示已发布/进行中的产品与发现入口（占位实现，后续接入数据）

export const runtime = 'edge';

import Link from 'next/link';

export default function ProductsSquarePage() {
  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[#2c3e50]">产品广场</h1>
        <p className="mt-2 text-[#95a5a6]">面向所有用户的产品发现与展示入口。后续将接入真实数据源与筛选。</p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#2c3e50]">快速开始</h2>
            <p className="mt-1 text-sm text-gray-600">从创意到产品，先发布你的第一个项目吧。</p>
          </div>
          <Link
            href="/projects/new"
            className="inline-block rounded-md bg-[#2ECC71] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#27AE60]"
          >
            新建项目
          </Link>
        </div>
      </section>

      {/* 占位的产品网格（后续替换为真实数据） */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1,2,3].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5">
            <div className="h-40 w-full rounded-lg bg-gray-100" />
            <h3 className="mt-4 text-[18px] font-semibold text-[#2c3e50]">示例产品 {i}</h3>
            <p className="mt-1 text-sm text-gray-600">这里是产品的一句话简介，占位文案，后续由接口返回。</p>
            <div className="mt-4 flex items-center justify-between">
              <Link href={`/projects/${i}`} className="text-sm text-[#3498db] hover:underline">查看详情</Link>
              <span className="text-xs text-gray-500">状态：开发中</span>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}