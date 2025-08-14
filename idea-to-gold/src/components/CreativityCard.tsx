import React from "react";

export interface CreativityCardProps {
  /** 作者昵称 */
  authorName: string;
  /** 作者头像地址（可选） */
  authorAvatarUrl?: string;
  /** 发布时间显示，如 “3小时前” */
  publishedAtText: string;
  /** 点子标题 */
  title: string;
  /** 点子描述 */
  description: string;
  /** 期望终端标签，如 ["网页", "iOS"] */
  tags?: string[];
  /** 赞同/想要的人数 */
  upvoteCount: number | string;
  /** 评论数量 */
  commentCount: number | string;
  /** 点赞/我也要 点击回调（可选） */
  onUpvote?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  /** 点击卡片整体（跳转等用途，可选） */
  onCardClick?: () => void;
  /** 自定义类名（可选） */
  className?: string;
}

function getInitialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0] ?? "").join("");
  return initials.toUpperCase();
}

function formatCount(count: number | string): string {
  if (typeof count === "string") return count;
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}m`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export default function CreativityCard(props: CreativityCardProps) {
  const {
    authorName,
    authorAvatarUrl,
    publishedAtText,
    title,
    description,
    tags = [],
    upvoteCount,
    commentCount,
    onUpvote,
    onCardClick,
    className = "",
  } = props;

  return (
    <div
      onClick={onCardClick}
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      className={`group bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-7 transition-transform transition-shadow duration-200 hover:shadow-md hover:-translate-y-0.5 ${onCardClick ? "cursor-pointer" : ""} ${className}`}
    >
      {/* 头部：头像、昵称、发布时间 */}
      <div className="flex items-center gap-3">
        {authorAvatarUrl ? (
          <img
            src={authorAvatarUrl}
            alt={`${authorName} avatar`}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ecf0f1] text-[#2c3e50] text-sm font-semibold">
            {getInitialsFromName(authorName)}
          </div>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-medium leading-5 text-[#2c3e50]">
            {authorName}
          </span>
          <span className="text-[13px] leading-5 text-[#95a5a6]">{publishedAtText}</span>
        </div>
      </div>

      {/* 中部：标题、描述、标签 */}
      <div className="mt-4 space-y-3">
        <h3 className="text-xl font-extrabold leading-7 text-[#2c3e50] group-hover:text-[#2ECC71] transition-colors">
          {title}
        </h3>
        <p className="text-[15px] leading-7 text-gray-600 line-clamp-2">{description}</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-[13px] leading-5 text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 底部：我也要按钮 与 评论 */}
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* 左侧：评论信息（小屏置顶） */}
        <div className="inline-flex items-center gap-2 text-[15px] text-[#2c3e50]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3498db"
            strokeWidth="2"
            className="h-5 w-5"
          >
            <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V5a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10z" />
          </svg>
          <span>{formatCount(commentCount)}</span>
        </div>

        {/* 右侧：我也要按钮（小屏占满一行） */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpvote?.(e);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2ECC71] px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-[#27AE60] w-full md:w-auto"
          aria-label="我也要"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>我也要 ({formatCount(upvoteCount)})</span>
        </button>
      </div>
    </div>
  );
}


