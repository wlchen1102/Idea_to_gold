// 用户个人中心页面
"use client";
// 声明允许cloudflare将动态页面部署到'边缘环境'上
export const runtime = 'edge';
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import CreativityCard from "@/components/CreativityCard";
import { useAuth } from "@/contexts/AuthContext";
import { requireSupabaseClient } from "@/lib/supabase";

type TabType = "createdIdeas" | "supportedIdeas" | "developedProjects";

// 用户资料接口
interface UserProfile {
  id: string;
  nickname: string;
  avatar_url?: string;
  bio?: string;
}

// 创意数据接口
interface Creative {
  id: string;
  title: string;
  description: string;
  tags: string[];
  created_at: string;
  author_id: string;
  upvote_count: number;
  comment_count: number;
  profiles: {
    nickname: string;
    avatar_url?: string;
  };
}

export default function ProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("createdIdeas");
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCreatives, setUserCreatives] = useState<Creative[]>([]);
  const [creativesLoading, setCreativesLoading] = useState(false);
  const [creativesError, setCreativesError] = useState<string | null>(null);

  // 使用ref来跟踪是否已经获取过用户资料
  const hasInitializedProfile = useRef(false);
  
  // 获取用户资料
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 如果是当前用户的个人中心，直接使用当前用户信息
        if (currentUser && currentUser.id === userId) {
          setProfileUser({
            id: currentUser.id,
            nickname: currentUser.nickname,
            avatar_url: currentUser.avatar_url,
            bio: currentUser.bio
          });
          setLoading(false);
          hasInitializedProfile.current = true;
          return;
        }
        
        // 否则从数据库获取其他用户的公开资料
        const supabase = requireSupabaseClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url, bio')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error('获取用户资料失败:', error);
          setError('用户不存在或获取资料失败');
        } else {
          setProfileUser(data);
          hasInitializedProfile.current = true;
        }
      } catch (err) {
        console.error('获取用户资料异常:', err);
        setError('获取用户资料时发生错误');
      } finally {
        setLoading(false);
      }
    };
    
    if (userId && !hasInitializedProfile.current) {
      fetchUserProfile();
    }
  }, [userId, currentUser]);

  // 获取用户创意列表
  useEffect(() => {
    let cancelled = false;
    
    const fetchUserCreatives = async () => {
      // 检查是否已取消或没有userId
      if (!userId || cancelled) {
        return;
      }
      
      try {
        setCreativesLoading(true);
        setCreativesError(null);
        
        // 获取当前用户的token
        const supabase = requireSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          setCreativesError('登录已过期，请重新登录');
          setCreativesLoading(false);
          // 清理本地存储的过期状态
          if (typeof window !== 'undefined') {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userId');
          }
          return;
        }
        
        const response = await fetch(`/api/users/${userId}/creatives`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          // 启用浏览器缓存
          cache: 'default',
          // 添加请求超时
          signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 检查组件是否已卸载
        if (!cancelled) {
          setUserCreatives(data.creatives || []);
        }
      } catch (err) {
        console.error('获取用户创意失败:', err);
        if (!cancelled) {
          setCreativesError(err instanceof Error ? err.message : '获取创意列表失败');
        }
      } finally {
        if (!cancelled) {
          setCreativesLoading(false);
        }
      }
    };
    
    // 只在userId存在时调用API
    if (userId) {
      fetchUserCreatives();
    }
    
    // cleanup函数：组件卸载时取消请求
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 加载状态 - 优化的骨架屏
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* 用户资料骨架屏 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="flex-grow">
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-3 w-48"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-32"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-64"></div>
              </div>
            </div>
          </div>
          
          {/* 标签页骨架屏 */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="border-b border-gray-200 px-6">
              <div className="flex space-x-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 w-24 bg-gray-200 rounded animate-pulse my-4"></div>
                ))}
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4">
                    <div className="h-6 bg-gray-200 rounded animate-pulse mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">用户不存在</h2>
          <p className="text-gray-600 mb-4">{error || '找不到该用户的资料'}</p>
          <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面主体 */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* 身份卡 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* 左侧：头像 */}
            <div className="flex-shrink-0">
              {profileUser.avatar_url ? (
                <Image
                  src={profileUser.avatar_url}
                  alt={`${profileUser.nickname}的头像`}
                  width={128}
                  height={128}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  unoptimized
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                  {profileUser.nickname?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* 右侧：信息 */}
            <div className="flex-grow">
              {/* 昵称和等级 */}
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-gray-900">{profileUser.nickname || '用户'}</h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300">
                  Lv.1
                </span>
              </div>

              {/* 个人简介 */}
              <p className="text-gray-600 text-base mb-4 leading-relaxed">
                {profileUser.bio || '这个用户还没有填写个人简介。'}
              </p>

              {/* 核心数据统计 */}
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">1,280</div>
                  <div className="text-sm text-gray-500">声望</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">15</div>
                  <div className="text-sm text-gray-500">我的创意</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">3</div>
                  <div className="text-sm text-gray-500">我的项目</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="bg-white rounded-lg shadow-md">
          {/* Tab 标题栏 */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-8 px-6" aria-label="选项卡">
              <button
                onClick={() => setActiveTab("createdIdeas")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "createdIdeas"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                aria-current={activeTab === "createdIdeas" ? "page" : undefined}
              >
                我的创意
              </button>
              <button
                onClick={() => setActiveTab("supportedIdeas")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "supportedIdeas"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                aria-current={activeTab === "supportedIdeas" ? "page" : undefined}
              >
                支持的创意
              </button>
              <button
                onClick={() => setActiveTab("developedProjects")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "developedProjects"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                aria-current={activeTab === "developedProjects" ? "page" : undefined}
              >
                我的项目
              </button>
            </nav>
          </div>

          {/* Tab 内容面板 */}
          <div className="p-6">
            {activeTab === "createdIdeas" && (
              <div>
                {creativesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">加载创意列表中...</p>
                    </div>
                  </div>
                ) : creativesError ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
                    <p className="text-gray-600">{creativesError}</p>
                  </div>
                ) : userCreatives.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">还没有发布创意</h3>
                    <p className="text-gray-600 mb-4">快去发布你的第一个创意吧！</p>
                    <Link href="/creatives/new" className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                      发布创意
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {userCreatives.map((creative) => {
                      // 格式化发布时间
                      const publishedAt = new Date(creative.created_at);
                      const now = new Date();
                      const diffInHours = Math.floor((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60));
                      
                      let publishedAtText: string;
                      if (diffInHours < 1) {
                        publishedAtText = '刚刚';
                      } else if (diffInHours < 24) {
                        publishedAtText = `${diffInHours} 小时前`;
                      } else if (diffInHours < 48) {
                        publishedAtText = '昨天';
                      } else if (diffInHours < 72) {
                        publishedAtText = '2 天前';
                      } else if (diffInHours < 168) {
                        publishedAtText = `${Math.floor(diffInHours / 24)} 天前`;
                      } else {
                        publishedAtText = '上周';
                      }
                      
                      return (
                        <CreativityCard
                          key={creative.id}
                          authorName={creative.profiles.nickname}
                          publishedAtText={publishedAtText}
                          title={creative.title}
                          description={creative.description}
                          tags={creative.tags}
                          upvoteCount={creative.upvote_count}
                          commentCount={creative.comment_count}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "supportedIdeas" && (
              <div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <CreativityCard
                    authorName="Alex"
                    publishedAtText="5 小时前"
                    title="跨平台待办协作板"
                    description="把日历、待办和看板融合到一起，支持家庭与小团队协作。"
                    tags={["移动端", "协作"]}
                    upvoteCount={233}
                    commentCount={18}
                  />
                  <CreativityCard
                    authorName="Mia"
                    publishedAtText="3 天前"
                    title="图片批量去背景云服务"
                    description="面向电商卖家与设计师的批量去背景引擎，开放 API 接入。"
                    tags={["云服务", "图像"]}
                    upvoteCount={740}
                    commentCount={92}
                  />
                  <CreativityCard
                    authorName="Leo"
                    publishedAtText="上周"
                    title="RSS 智能聚合器"
                    description="用大模型给订阅源做去重与摘要，节省阅读时间。"
                    tags={["阅读", "AI"]}
                    upvoteCount={401}
                    commentCount={35}
                  />
                </div>
              </div>
            )}

            {activeTab === "developedProjects" && (
              <div>
                {/* 轻量内联 ProjectCard，只用于个人主页演示复用样式 */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div>
                      <h3 className="text-[18px] font-semibold text-[#2c3e50]">会议纪要自动化助手</h3>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 border-green-200">开发中</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-600">将会议录音转写并自动抽取行动项，支持与团队协作工具同步。</p>
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div className="flex-1 border-l-4 border-gray-200 pl-3">
                          <Link href="/idea/1" className="text-[13px] text-[#3498db] hover:underline">
                            源于创意：AI会议纪要助手
                          </Link>
                        </div>
                        <div className="flex shrink-0 items-center gap-4 text-[12px] text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                            1280
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" /></svg>
                            312
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5">
                      <Link href="/project/1" className="block w-full rounded-lg bg-[#2ECC71] px-4 py-2.5 text-center text-[14px] font-semibold text-white hover:bg-[#27AE60]">
                        管理项目
                      </Link>
                    </div>
                  </div>

                  <div className="flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div>
                      <h3 className="text-[18px] font-semibold text-[#2c3e50]">智能行动项追踪器</h3>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 border-gray-200">已发布</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-600">基于NLP的行动项归因与提醒工具，帮助团队闭环推进任务。</p>
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div className="flex-1 border-l-4 border-gray-200 pl-3">
                          <Link href="/idea/2" className="text-[13px] text-[#3498db] hover:underline">
                            源于创意：行动项提取与提醒
                          </Link>
                        </div>
                        <div className="flex shrink-0 items-center gap-4 text-[12px] text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                            640
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" /></svg>
                            120
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5">
                      <Link href="/project/2" className="block w-full rounded-lg bg-[#2ECC71] px-4 py-2.5 text-center text-[14px] font-semibold text-white hover:bg-[#27AE60]">
                        管理项目
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}