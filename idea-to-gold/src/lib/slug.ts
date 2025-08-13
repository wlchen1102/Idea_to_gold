// 将标题转为 URL 友好的 slug：
// - 使用 NFKC 归一化
// - 将空白替换为连字符
// - 保留中文、英文字母、数字、下划线与连字符，去掉其他符号
export function slugify(title: string): string {
  return title
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\u4e00-\u9fa5\w\-]/g, "")
    .toLowerCase();
}


