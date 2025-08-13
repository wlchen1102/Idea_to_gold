export interface Idea {
  id: string;
  authorName: string;
  publishedAtText: string;
  title: string;
  description: string;
  tags: string[];
  upvoteCount: number;
  commentCount: number;
  createdAt: number; // 时间戳，便于“最新”排序
}

export const ideas: Idea[] = [
  {
    id: "1",
    authorName: "小李",
    publishedAtText: "3小时前",
    title: "用 AI 生成个性化学习计划",
    description: "根据学生的学习目标和时间碎片，生成可执行的学习路径与提醒。",
    tags: ["网页", "iOS"],
    upvoteCount: 1200,
    commentCount: 87,
    createdAt: Date.now() - 3 * 60 * 60 * 1000,
  },
  {
    id: "2",
    authorName: "阿明",
    publishedAtText: "1天前",
    title: "语音驱动的待办应用",
    description: "通过语音即可创建、整理与提醒，适合开车或做饭时使用。",
    tags: ["iOS", "Android"],
    upvoteCount: 860,
    commentCount: 34,
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
  },
  {
    id: "3",
    authorName: "Zoe",
    publishedAtText: "2小时前",
    title: "AI 选股情绪雷达",
    description: "聚合新闻/社媒情绪，生成低门槛的个股风险提示。",
    tags: ["网页"],
    upvoteCount: 1540,
    commentCount: 102,
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: "4",
    authorName: "老王",
    publishedAtText: "5小时前",
    title: "旅行行程自动规划器",
    description: "根据预算和时间一键生成城市内最佳路线与避坑建议。",
    tags: ["网页", "小程序"],
    upvoteCount: 990,
    commentCount: 45,
    createdAt: Date.now() - 5 * 60 * 60 * 1000,
  },
  {
    id: "5",
    authorName: "Iris",
    publishedAtText: "刚刚",
    title: "面试题实时刷题助手",
    description: "基于岗位 JD 即时生成模拟面试与评分反馈。",
    tags: ["网页"],
    upvoteCount: 430,
    commentCount: 12,
    createdAt: Date.now() - 5 * 60 * 1000,
  },
  {
    id: "6",
    authorName: "Ken",
    publishedAtText: "2天前",
    title: "健身动作 AI 纠错",
    description: "用摄像头识别动作姿态，给出即时纠正与训练计划。",
    tags: ["iOS", "Android"],
    upvoteCount: 1320,
    commentCount: 73,
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
];


