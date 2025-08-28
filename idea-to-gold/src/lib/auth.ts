import { requireSupabaseClient } from "./supabase";

export interface FreshAuth {
  /** Bearer token，可直接作为请求头 Authorization: Bearer {token} */
  token: string;
  /** 当前登录用户 ID，未登录时为 null */
  userId: string | null;
}

/**
 * 获取"尽可能新鲜"的 Supabase 访问令牌。
 *
 * Supabase JS 客户端在前端会维护一个定时器自动刷新 `access_token`。
 * 但若页面长时间处于后台或用户网络环境不佳，可能出现 token 临近过期却未及时刷新的情况，
 * 进而导致后端把请求识别为匿名，从而造成“登录态失效”的错觉。
 *
 * 该辅助函数会：
 * 1. 读取当前 session；
 * 2. 若 token 距离过期不足 `thresholdMs`（默认 60s），主动调用 `refreshSession()`；
 * 3. 返回刷新后的最新 token 与 userId。
 */
export async function getFreshAuth(thresholdMs: number = 60_000): Promise<FreshAuth> {
  const supabase = requireSupabaseClient();

  // 1) 先读现有 session
  let {
    data: { session },
  } = await supabase.auth.getSession();

  // 若距离过期 < thresholdMs，则主动刷新
  if (session?.expires_at) {
    const remains = session.expires_at * 1000 - Date.now();
    if (remains < thresholdMs) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (!error && refreshed?.session) {
        session = refreshed.session;
      }
    }
  }

  return {
    token: session?.access_token || "",
    userId: session?.user?.id || null,
  };
}