// 轻量 fetch 超时封装（仅在前端使用）
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: (RequestInit & { timeoutMs?: number })
): Promise<Response> {
  const { timeoutMs = 10000, signal: userSignal, ...rest } = init || {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // 若用户自己传入了 signal，则同时响应两者的中断
  if (userSignal) {
    if (userSignal.aborted) controller.abort();
    else userSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const resp = await fetch(input, { ...rest, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}