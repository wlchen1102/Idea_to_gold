export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">隐私政策</h1>
        <p className="mt-4 text-gray-600">本页面为占位版本，用于本地开发和测试。正式内容请后续完善。</p>
        <section className="mt-8 space-y-4 text-gray-700 leading-7">
          <p>1. 我们非常重视你的隐私，将尽最大努力保护你的个人信息安全。</p>
          <p>2. 我们仅收集与提供服务所必要的最少信息。</p>
          <p>3. 除非依法或取得你授权，我们不会向第三方提供你的个人信息。</p>
          <p>4. 本政策可能会根据法律与业务调整进行更新。</p>
        </section>
        <div className="mt-10">
          <a href="/" className="text-emerald-600 hover:underline">返回首页</a>
        </div>
      </div>
    </main>
  );
}