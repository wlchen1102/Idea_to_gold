// 轻量 fetch 超时封装（仅在前端使用）
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: (RequestInit & { timeoutMs?: number })
): Promise<Response> {
  const { timeoutMs = 10000, signal: userSignal, ...rest } = init || {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);

  // 若用户自己传入了 signal，则同时响应两者的中断
  if (userSignal) {
    if ((userSignal as AbortSignal).aborted) controller.abort((userSignal as any).reason ?? 'external-signal');
    else (userSignal as AbortSignal).addEventListener("abort", () => controller.abort((userSignal as any).reason ?? 'external-signal'), { once: true });
  }

  try {
    const resp = await fetch(input, { ...rest, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}