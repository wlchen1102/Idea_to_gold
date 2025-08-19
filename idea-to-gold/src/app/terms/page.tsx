import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">用户协议</h1>
        <p className="mt-4 text-gray-600">本页面为占位版本，用于本地开发和测试。正式内容请后续完善。</p>
        <section className="mt-8 space-y-4 text-gray-700 leading-7">
          <p>1. 使用本网站即表示你同意遵守本用户协议的各项条款。</p>
          <p>2. 为了提供服务，我们可能会收集与保存你在使用过程中的必要信息。</p>
          <p>3. 你应合法使用本网站，不得发布或传播违法内容。</p>
          <p>4. 我们可能在不另行通知的情况下对本协议进行更新。</p>
        </section>
        <div className="mt-10">
          <Link href="/" className="text-emerald-600 hover:underline">返回首页</Link>
        </div>
      </div>
    </main>
  );
}