import Link from "next/link";
import type React from "react";

type PageParams = { id: string };
type PageProps = { params: Promise<PageParams> };

function Avatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ecf0f1] text-[#2c3e50] text-sm font-semibold">
      {initials}
    </div>
  );
}

function Step({
  icon,
  label,
  state,
}: {
  icon: string;
  label: string;
  state: "done" | "active" | "todo";
}) {
  const circleColorClass =
    state === "active"
      ? "border-[#2ECC71] text-[#2ECC71]"
      : state === "done"
      ? "border-gray-700 text-gray-700"
      : "border-gray-300 text-gray-400";
  const labelColorClass =
    state === "active" ? "text-[#2ECC71]" : state === "done" ? "text-gray-600" : "text-gray-400";

  return (
    <div className="flex flex-col items-center">
      <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${circleColorClass}`}>
        <span className="text-base" aria-hidden>
          {state === "done" ? "✓" : icon}
        </span>
      </div>
      <div className={`mt-1 text-xs font-medium ${labelColorClass}`}>{label}</div>
    </div>
  );
}

export default async function ProjectHomePage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const project = {
    id,
    title: "【项目】会议纪要自动化助手",
    owner: { name: "Zoe" },
    fromIdea: { title: "AI会议纪要助手", href: "/idea/1/ai-会议记录与行动项提取" },
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* 左侧主内容区 */}
        <section className="md:col-span-2">
          {/* 项目核心信息 */}
          <h1 className="text-3xl font-extrabold leading-9 text-[#2c3e50]">{project.title}</h1>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={project.owner.name} />
            <div>
              <p className="text-[14px] font-medium text-[#2c3e50]">{project.owner.name}</p>
              <p className="text-[12px] text-[#95a5a6]">项目所有者</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-gray-50 p-4">
            <div className="border-l-4 border-gray-300 pl-4 text-sm text-gray-700">
              <Link href={project.fromIdea.href} className="text-[#3498db] hover:underline">
                源于创意：{project.fromIdea.title}
              </Link>
            </div>
          </div>

          {/* 发布动态入口（模拟） */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label htmlFor="postUpdate" className="block text-sm font-medium text-[#2c3e50]">
              发布项目动态
            </label>
            <textarea
              id="postUpdate"
              rows={4}
              placeholder="有什么新进展？和大家分享一下吧..."
              className="mt-2 w-full rounded-md border border-gray-300 p-3 text-[14px] leading-6 focus:border-[#2ECC71] focus:outline-none"
            />
            <div className="mt-3 text-right">
              <button type="button" className="rounded-lg bg-[#2ECC71] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#27AE60]">
                发布动态
              </button>
            </div>
          </div>

          {/* 开发日志时间轴 */}
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2c3e50]">开发日志</h2>
            <ul className="mt-4 space-y-6">
              {/* 日志 1：规划阶段 */}
              <li className="flex items-start gap-3">
                <Avatar name="Zoe" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[14px] font-medium text-[#2c3e50]">Zoe</div>
                    <div className="text-[12px] text-gray-500">3天前</div>
                  </div>
                  <div className="mt-1 text-[15px] font-semibold text-[#2c3e50]">项目规划与功能定义 V1.0</div>
                  <p className="mt-1 text-[14px] leading-6 text-gray-700">
                    进行了整体功能范围界定与优先级排序，确定了 MVP 的目标：自动转写、行动项提取与协作平台同步。
                  </p>
                </div>
              </li>
              {/* 日志 2：开发阶段 */}
              <li className="flex items-start gap-3">
                <Avatar name="Ken" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[14px] font-medium text-[#2c3e50]">Ken</div>
                    <div className="text-[12px] text-gray-500">1天前</div>
                  </div>
                  <div className="mt-1 text-[15px] font-semibold text-[#2c3e50]">第一周开发进度</div>
                  <p className="mt-1 text-[14px] leading-6 text-gray-700">
                    已完成核心API的开发，下一步将进行前端对接。
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* 右侧信息栏（仪表盘） */}
        <aside className="md:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* 阶段进度条 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-[16px] font-semibold text-[#2c3e50]">项目阶段</h3>
              <div className="flex items-center gap-3">
                <Step icon="💡" label="规划中" state="done" />
                <div className="h-0.5 flex-1 bg-[#2ECC71]" />
                <Step icon="💻" label="开发中" state="active" />
                <div className="h-0.5 flex-1 bg-gray-200" />
                <Step icon="📦" label="内测中" state="todo" />
                <div className="h-0.5 flex-1 bg-gray-200" />
                <Step icon="✅" label="已发布" state="todo" />
              </div>
            </div>

            {/* 核心数据仪表盘 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <ul className="space-y-3 text-[14px] text-[#2c3e50]">
                <li className="flex items-center justify-between">
                  <span className="text-gray-600">想要用户数</span>
                  <span className="font-semibold">1.5k</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-gray-600">日志更新数</span>
                  <span className="font-semibold">5</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-gray-600">项目浏览量</span>
                  <span className="font-semibold">3.2k</span>
                </li>
              </ul>
            </div>

            {/* 发布产品按钮 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <button className="w-full rounded-xl bg-[#2ECC71] px-5 py-3 text-[16px] font-semibold text-white hover:bg-[#27AE60]">
                发布最终产品
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}


