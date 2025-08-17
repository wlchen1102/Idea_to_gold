// 产品落地页
"use client";

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';

// 全局 Motion 接口类型声明
declare global {
  interface Window {
    Motion: {
      animate: (target: string | Element | Element[], properties: any, options?: any) => any;
      scroll: (callback: any, options?: any) => any;
      inView: (target: string | Element, callback: any, options?: any) => any;
    };
  }
}

export default function LandingPage() {
  const [motionLoaded, setMotionLoaded] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Motion 加载后初始化动画
  useEffect(() => {
    if (!motionLoaded || !window.Motion) return;

    // 仅解构已确认存在的 API
    const { animate, scroll } = window.Motion;
    const inView = window.Motion.inView;

    // 页面加载动画
    animate('.hero-title', { 
      opacity: [0, 1], 
      y: [30, 0] 
    }, { 
      duration: 1, 
      delay: 0.2,
      ease: "easeOut"
    });

    animate('.hero-subtitle', { 
      opacity: [0, 1], 
      y: [20, 0] 
    }, { 
      duration: 0.8, 
      delay: 0.5,
      ease: "easeOut"
    });

    animate('.hero-cta', { 
      opacity: [0, 1], 
      scale: [0.9, 1] 
    }, { 
      duration: 0.6, 
      delay: 0.8,
      ease: "easeOut"
    });

    // 滚动触发动画（存在性守卫）
    if (inView) {
      inView('.problem-section', () => {
        animate('.problem-card', {
          opacity: [0, 1],
          y: [50, 0]
        }, {
          duration: 0.8,
          delay: 0.1,
          ease: "easeOut"
        });
      });

      inView('.solution-section', () => {
        animate('.solution-step', {
          opacity: [0, 1],
          y: [40, 0]
        }, {
          duration: 0.6,
          delay: (i: number) => i * 0.15,
          ease: "easeOut"
        });
      });

      inView('.features-section', () => {
        animate('.feature-card', {
          opacity: [0, 1],
          x: [30, 0]
        }, {
          duration: 0.8,
          delay: (i: number) => i * 0.2,
          ease: "easeOut"
        });
      });

      inView('.showcase-section', () => {
        animate('.showcase-card', {
          opacity: [0, 1],
          scale: [0.95, 1]
        }, {
          duration: 0.7,
          delay: (i: number) => i * 0.1,
          ease: "easeOut"
        });
      });
    }

    // 视差滚动效果
    scroll(({ y }: { y: number }) => {
      if (heroRef.current) {
        animate(heroRef.current, {
          transform: `translateY(${y * 0.5}px)`
        }, { duration: 0 });
      }
    });

  }, [motionLoaded]);

  return (
    <>
      <Script 
        src="https://cdn.jsdelivr.net/npm/motion@latest/dist/motion.js"
        onLoad={() => setMotionLoaded(true)}
      />
      
      {/* 移除：项目已内置 Tailwind v4，无需 CDN 注入 */}
      {/* <Script src="https://cdn.jsdelivr.net/npm/tailwindcss@4.0.0-alpha.32/tailwind.min.js" /> */}
      
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
      />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        
        {/* 区块一：英雄区 (Hero Section) */}
        <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-blue-50 pb-20 pt-6">

          {/* 背景装饰 */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-10 left-10 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl"></div>
            <div className="absolute top-40 right-20 h-96 w-96 rounded-full bg-blue-200/20 blur-3xl"></div>
            <div className="absolute bottom-20 left-1/3 h-80 w-80 rounded-full bg-purple-200/20 blur-3xl"></div>
          </div>

          {/* 英雄内容 */}
          <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="hero-title text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
                点亮你的
                <span className="bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent">
                  AI创意
                </span>
                <br />
                让世界看到你的创造
              </h1>
              
              <p className="hero-subtitle mx-auto mt-6 max-w-3xl text-xl text-gray-600 leading-8">
                一个连接真实需求与顶尖AI开发者的孵化平台。在这里，每个好创意都能"点石成金"。
              </p>

              <div className="hero-cta mt-10">
                <Link href="/creatives/new" className="group relative inline-flex overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-12 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:shadow-2xl hover:scale-105">
                  <span className="relative z-10 flex items-center gap-2">
                    免费发布你的创意
                    <i className="fas fa-arrow-right transition-transform group-hover:translate-x-1"></i>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-700 opacity-0 transition-opacity group-hover:opacity-100"></div>
                </Link>
              </div>

              <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-500">
                <span>已被来自以下机构的创造者们使用</span>
                <div className="flex items-center gap-6">
                  <i className="fab fa-google text-2xl text-blue-500"></i>
                  <i className="fab fa-meta text-2xl text-blue-600"></i>
                  <span className="font-semibold text-red-600">Stanford</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 区块二：痛点共鸣区 (Problem Section) */}
        <section ref={problemRef} className="problem-section py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">一个创意，两种困境</h2>
              <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-blue-500 mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* 开发者困境 */}
              <div className="problem-card relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 p-8 shadow-lg">
                <div className="absolute top-4 right-4">
                  <i className="fas fa-code text-3xl text-red-400"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  "手握AI的锤子，却找不到市场的钉子"
                </h3>
                <p className="text-gray-700 leading-7 mb-6">
                  作为AI开发者，你拥有前沿的技术能力和无限的创造潜能。但现实是残酷的——你苦苦寻找真正有价值的应用场景，
                  却往往陷入闭门造车的困局。你的技术才华被闲置，创造力无处释放。
                </p>
                <div className="flex items-center gap-4 text-sm text-red-600">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span className="font-medium">缺乏真实市场需求指引</span>
                </div>
              </div>

              {/* 创想家困境 */}
              <div className="problem-card relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 p-8 shadow-lg">
                <div className="absolute top-4 right-4">
                  <i className="fas fa-lightbulb text-3xl text-blue-400"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  "我有绝佳的想法，却无法让它变为现实"
                </h3>
                <p className="text-gray-700 leading-7 mb-6">
                  你是敏锐的观察者，总能发现生活中的痛点和机会。你的脑海中涌现着改变世界的创意，
                  但技术门槛如高山般横亘在前。你只能眼睁睁看着绝妙的点子在时间中被遗忘。
                </p>
                <div className="flex items-center gap-4 text-sm text-blue-600">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span className="font-medium">缺乏技术实现渠道</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 区块三：解决方案区 (Solution Section) */}
        <section ref={solutionRef} className="solution-section py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">我们如何连接才华与需求？</h2>
              <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-blue-500 mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* 步骤1 */}
              <div className="solution-step text-center">
                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-lg">
                  <i className="fas fa-lightbulb text-2xl"></i>
                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-500 font-bold text-sm">1</div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">发布创意</h3>
                <p className="text-gray-600 leading-6">
                  任何人都能提交想法，AI副驾辅助澄清需求，让模糊的想法变得清晰可行。
                </p>
              </div>

              {/* 步骤2 */}
              <div className="solution-step text-center">
                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-lg">
                  <i className="fas fa-users text-2xl"></i>
                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-500 font-bold text-sm">2</div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">社区验证</h3>
                <p className="text-gray-600 leading-6">
                  社区投票决定创意的价值，形成真实的市场信号，确保值得投入的项目。
                </p>
              </div>

              {/* 步骤3 */}
              <div className="solution-step text-center">
                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-400 to-purple-500 text-white shadow-lg">
                  <i className="fas fa-code text-2xl"></i>
                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-purple-500 font-bold text-sm">3</div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">开发实现</h3>
                <p className="text-gray-600 leading-6">
                  全球的"造物者"认领项目，透明化开发过程，实时追踪进度。
                </p>
              </div>

              {/* 步骤4 */}
              <div className="solution-step text-center">
                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg">
                  <i className="fas fa-star text-2xl"></i>
                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-orange-500 font-bold text-sm">4</div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">价值共享</h3>
                <p className="text-gray-600 leading-6">
                  产品上线，创想家解决问题，造物者获得回报，形成良性生态。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 区块四：核心功能亮点区 (Features Section) */}
        <section ref={featuresRef} className="features-section py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">不止于连接，更是一座孵化器</h2>
              <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-blue-500 mx-auto rounded-full"></div>
            </div>

            <div className="space-y-20">
              {/* 功能1：AI副驾 */}
              <div className="feature-card grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white mb-6">
                    <i className="fas fa-robot text-xl"></i>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">AI需求分析师</h3>
                  <p className="text-lg text-gray-600 leading-8 mb-6">
                    不再是简单的提交表单。我们的AI副驾通过多轮对话，帮你理清思路，
                    将模糊的想法转化为清晰、可执行的需求文档。
                  </p>
                  <div className="flex items-center gap-4 text-emerald-600">
                    <i className="fas fa-check-circle"></i>
                    <span className="font-medium">智能需求挖掘 • 实时对话澄清 • 自动文档生成</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50 p-8 shadow-xl">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex-shrink-0"></div>
                        <div className="bg-white rounded-lg p-3 shadow-sm flex-1">
                          <p className="text-sm text-gray-700">描述一下你的创意...</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 flex-row-reverse">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0"></div>
                        <div className="bg-emerald-100 rounded-lg p-3 shadow-sm flex-1">
                          <p className="text-sm text-gray-700">我想要一个AI会议助手...</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 功能2：项目空间 */}
              <div className="feature-card grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="lg:order-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white mb-6">
                    <i className="fas fa-chart-line text-xl"></i>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">透明化的项目空间</h3>
                  <p className="text-lg text-gray-600 leading-8 mb-6">
                    告别黑盒开发。通过阶段式进度条和开发日志，实时追踪你的创意从代码到产品的每一步。
                  </p>
                  <div className="flex items-center gap-4 text-blue-600">
                    <i className="fas fa-check-circle"></i>
                    <span className="font-medium">实时进度追踪 • 开发日志透明 • 里程碑管理</span>
                  </div>
                </div>
                <div className="lg:order-1 relative">
                  <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 p-8 shadow-xl">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-700">项目进度</span>
                        <span className="text-sm text-blue-600 font-semibold">75%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{width: '75%'}}></div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1"></div>
                          <span className="text-gray-600">规划</span>
                        </div>
                        <div className="text-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1"></div>
                          <span className="text-gray-600">开发</span>
                        </div>
                        <div className="text-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1"></div>
                          <span className="text-gray-600">测试</span>
                        </div>
                        <div className="text-center">
                          <div className="w-3 h-3 bg-gray-300 rounded-full mx-auto mb-1"></div>
                          <span className="text-gray-400">发布</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 功能3：社区驱动 */}
              <div className="feature-card grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white mb-6">
                    <i className="fas fa-heart text-xl"></i>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">社区驱动的价值发现</h3>
                  <p className="text-lg text-gray-600 leading-8 mb-6">
                    最好的创意由市场决定。通过'我也要'投票，让每一个创意在投入开发前，
                    都经过真实用户的验证。
                  </p>
                  <div className="flex items-center gap-4 text-purple-600">
                    <i className="fas fa-check-circle"></i>
                    <span className="font-medium">社区投票验证 • 真实需求筛选 • 市场热度排名</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 p-8 shadow-xl">
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                        <h4 className="font-medium text-gray-900 mb-2">AI智能客服助手</h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-heart text-purple-500"></i>
                            <span className="text-sm text-gray-600">2.3k 人想要</span>
                          </div>
                          <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">热门</div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                        <h4 className="font-medium text-gray-900 mb-2">会议纪要自动化</h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-heart text-gray-400"></i>
                            <span className="text-sm text-gray-600">856 人想要</span>
                          </div>
                          <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">开发中</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 区块五：社会认同/成功案例区 (Social Proof / Showcase) */}
        <section ref={showcaseRef} className="showcase-section py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">正在"点石成金"的创意</h2>
              <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-blue-500 mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* 创意卡片1 */}
              <div className="showcase-card group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2">
                <div className="absolute top-4 right-4 z-10">
                  <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    已被认领
                  </div>
                </div>
                <div className="aspect-video bg-gradient-to-br from-blue-400 to-purple-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-microphone-alt text-4xl text-white"></i>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">AI会议纪要助手</h3>
                  <p className="text-gray-600 text-sm leading-6 mb-4">
                    自动识别会议要点，生成行动项清单，与团队协作工具无缝集成。
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-heart text-emerald-500"></i>
                      <span className="text-sm text-gray-600">856 人想要</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                      <span className="text-xs text-gray-500">by Ken</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 创意卡片2 */}
              <div className="showcase-card group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2">
                <div className="absolute top-4 right-4 z-10">
                  <div className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                    开发中
                  </div>
                </div>
                <div className="aspect-video bg-gradient-to-br from-emerald-400 to-blue-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-chart-line text-4xl text-white"></i>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">智能数据可视化</h3>
                  <p className="text-gray-600 text-sm leading-6 mb-4">
                    AI自动分析数据趋势，生成交互式图表，让数据洞察触手可及。
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-heart text-emerald-500"></i>
                      <span className="text-sm text-gray-600">1.2k 人想要</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                      <span className="text-xs text-gray-500">by Alex</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 创意卡片3 */}
              <div className="showcase-card group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2">
                <div className="absolute top-4 right-4 z-10">
                  <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    等待认领
                  </div>
                </div>
                <div className="aspect-video bg-gradient-to-br from-purple-400 to-pink-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-language text-4xl text-white"></i>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">AI语言学习伙伴</h3>
                  <p className="text-gray-600 text-sm leading-6 mb-4">
                    个性化口语练习，实时发音纠正，让语言学习更高效有趣。
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-heart text-emerald-500"></i>
                      <span className="text-sm text-gray-600">3.1k 人想要</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                      <span className="text-xs text-gray-500">by Sarah</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 统计数据 */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-emerald-500 mb-2">1,247</div>
                <div className="text-gray-600">活跃创意</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-500 mb-2">89</div>
                <div className="text-gray-600">已上线产品</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-500 mb-2">5.2k</div>
                <div className="text-gray-600">社区成员</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-500 mb-2">12.8k</div>
                <div className="text-gray-600">累计投票</div>
              </div>
            </div>
          </div>
        </section>

        {/* 区块六：最终行动召唤区 (Final CTA Section) */}
        <section ref={ctaRef} className="py-20 bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 relative overflow-hidden">
          {/* 背景装饰 */}
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
            <div className="absolute bottom-20 right-20 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
            <div className="absolute top-1/2 left-1/3 h-24 w-24 rounded-full bg-white/5 blur-xl"></div>
          </div>

          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-white mb-6">
              准备好开启你的创造之旅了吗？
            </h2>
            <p className="text-xl text-white/90 mb-8 leading-8">
              加入我们的创新社区，让你的想法变成改变世界的产品
            </p>
            
            <Link href="/login" className="group relative inline-flex overflow-hidden rounded-xl bg-emerald-500 px-12 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:shadow-2xl hover:scale-105">
              <span className="relative z-10 flex items-center gap-2">
                立即免费注册，点亮你的第一个创意
                <i className="fas fa-sparkles transition-transform group-hover:rotate-12"></i>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-blue-50 opacity-0 transition-opacity group-hover:opacity-100"></div>
            </Link>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-white/80">
              <div className="flex items-center gap-2">
                <i className="fas fa-check text-green-300"></i>
                <span>完全免费</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fas fa-check text-green-300"></i>
                <span>无需技术背景</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fas fa-check text-green-300"></i>
                <span>30秒即可发布创意</span>
              </div>
            </div>
          </div>
        </section>

        {/* 页脚 (Footer) */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm">
                    点
                  </div>
                  <span className="text-xl font-bold">点子成金</span>
                </div>
                <p className="text-gray-400 leading-6 max-w-md">
                  连接创意与技术，让每个好想法都能成为改变世界的产品。
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">产品</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="#" className="hover:text-white transition-colors">创意广场</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">项目空间</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">AI副驾</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">公司</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="#" className="hover:text-white transition-colors">关于我们</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">联系方式</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">服务条款</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between">
              <p className="text-gray-400 text-sm">
                © 2024 点子成金. 保留所有权利.
              </p>
              <div className="flex items-center gap-4 mt-4 md:mt-0">
                <i className="fab fa-twitter text-gray-400 hover:text-white cursor-pointer transition-colors"></i>
                <i className="fab fa-github text-gray-400 hover:text-white cursor-pointer transition-colors"></i>
                <i className="fab fa-linkedin text-gray-400 hover:text-white cursor-pointer transition-colors"></i>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}