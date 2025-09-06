"use client";
/**
 * 组件：Uploader（通用文件上传）
 * 作用：
 *  - 渲染文件选择与操作按钮
 *  - 前端预校验（文件类型与大小）
 *  - 显示上传中的加载与进度
 *  - 调用后端 POST /api/upload 接口（附带 Authorization: Bearer <token>）
 *  - 上传成功后通过 onUploadSuccess(url) 回传文件URL
 *  - 优化：
 *    1) 点击按钮在未选择文件时，直接唤起系统文件选择对话框；
 *    2) 选择文件通过校验后，自动开始上传（先响应，后处理）。
 *    3) 新增 props: autoOpenOnMount => 组件挂载时自动唤起文件选择。
 *  - 新增：
 *    4) 通过 forwardRef 暴露方法：open() 与 cancel()，用于无 UI 模式下直接触发文件选择与取消上传。
 *    5) 支持延迟上传：新增 props autoUpload（默认 true）与 onFileSelected 回调，设置 autoUpload=false 时仅选择文件并回调预览，不会立即上传；通过 ref.uploadSelected() 在稍后执行上传。
 * 
 * 使用示例：
 *  <Uploader onUploadSuccess={(url) => setImageUrl(url)} />
 *  可选参数：
 *   - allowedTypes?: string[]  默认 ['image/jpeg','image/png']
 *   - maxSizeMB?: number       默认 5（MB）
 *   - buttonText?: string      默认 '上传'
 *   - className?: string       外层容器自定义样式类
 *   - fieldName?: string       表单字段名，默认 'file'（需与后端保持一致）
 *   - autoOpenOnMount?: boolean 默认 false，若为 true 则挂载时自动打开选择框
 *   - autoUpload?: boolean      默认 true，若为 false 则仅选择文件并通过 onFileSelected 回调，不自动上传
 *   - onFileSelected?: (file, previewUrl) => void 文件选择时回调（常用于头像预览）
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { requireSupabaseClient } from "@/lib/supabase";

interface UploaderProps {
  onUploadSuccess: (url: string) => void;
  allowedTypes?: readonly string[];
  maxSizeMB?: number;
  buttonText?: string;
  className?: string;
  fieldName?: string;
  autoOpenOnMount?: boolean;
  autoUpload?: boolean;
  onFileSelected?: (file: File, previewUrl: string) => void;
}

interface UploadResponse {
  message: string;
  url?: string;
  error?: string;
  bucket?: string;
  key?: string;
  contentType?: string;
  size?: number;
  details?: string;
}

export type UploaderHandle = {
  /**
   * 打开文件选择对话框；若已选择文件，则根据 autoUpload 决定是否立即上传。
   */
  open: () => void;
  /**
   * 取消当前上传（若在进行中）。
   */
  cancel: () => void;
  /**
   * 在已选择文件的前提下，手动触发上传；返回成功后的 URL，失败时返回 null。
   */
  uploadSelected: () => Promise<string | null>;
};

const DEFAULT_TYPES = ["image/jpeg", "image/png"] as const;
const DEFAULT_MAX_MB = 5;

const Uploader = forwardRef<UploaderHandle, UploaderProps>(function Uploader(
  {
    onUploadSuccess,
    allowedTypes = DEFAULT_TYPES,
    maxSizeMB = DEFAULT_MAX_MB,
    buttonText = "上传",
    className,
    fieldName = "file",
    autoOpenOnMount = false,
    autoUpload = true,
    onFileSelected,
  }: UploaderProps,
  ref
) {
  // 选择的文件
  const [file, setFile] = useState<File | null>(null);
  // 进度 0-100
  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  // 隐藏文件输入框的 ref，用于程序化触发文件选择
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // 记录最近一次创建的 object URL（用于释放）
  const lastObjectUrlRef = useRef<string | null>(null);

  const acceptAttr = useMemo(() => allowedTypes.join(","), [allowedTypes]);
  const maxSizeBytes = useMemo(() => maxSizeMB * 1024 * 1024, [maxSizeMB]);

  // 卸载时释放 object URL，避免内存泄漏
  useEffect(() => {
    return () => {
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
    };
  }, []);

  // 组件挂载（或 autoOpenOnMount 变化）时，自动唤起文件选择
  useEffect(() => {
    if (autoOpenOnMount && !isUploading) {
      // setTimeout 确保元素已挂载
      const t = setTimeout(() => fileInputRef.current?.click(), 0);
      return () => clearTimeout(t);
    }
    return;
  }, [autoOpenOnMount, isUploading]);

  // 使用目标文件直接执行上传（供自动上传与按钮触发共用）
  const doUploadWithFile = useCallback(
    async (targetFile: File): Promise<string | null> => {
      setErrorMsg("");
      setSuccessMsg("");

      // 前置校验
      if (!allowedTypes.includes(targetFile.type)) {
        setErrorMsg("不支持的文件类型，仅允许：" + allowedTypes.join(", "));
        return null;
      }
      if (targetFile.size <= 0 || targetFile.size > maxSizeBytes) {
        setErrorMsg(`文件大小超出限制（最大 ${maxSizeMB}MB）`);
        return null;
      }

      // 获取 Supabase 会话，准备 Authorization 头
      let token = "";
      try {
        const supabase = requireSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        token = sessionData?.session?.access_token ?? "";
      } catch (_err) {
        setErrorMsg("无法获取登录状态，请检查前端环境变量或先登录后再尝试上传");
        return null;
      }

      if (!token) {
        setErrorMsg("未登录或登录已过期，请先登录");
        return null;
      }

      const form = new FormData();
      form.append(fieldName, targetFile);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.open("POST", "/api/upload", true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const ratio = event.total > 0 ? Math.round((event.loaded / event.total) * 100) : 0;
        setProgress(ratio);
      };

      xhr.onloadstart = () => {
        setIsUploading(true);
        setProgress(0);
      };

      xhr.onerror = () => {
        setIsUploading(false);
        setErrorMsg("网络错误，上传失败，请稍后重试");
      };

      xhr.onabort = () => {
        setIsUploading(false);
        setErrorMsg("已取消上传");
      };

      return await new Promise<string | null>((resolve) => {
        xhr.onload = () => {
          setIsUploading(false);
          const status = xhr.status;
          let resp: UploadResponse | null = null;
          try {
            resp = (xhr.responseText ? JSON.parse(xhr.responseText) : null) as UploadResponse | null;
          } catch (_e) {
            resp = null;
          }

          if (status >= 200 && status < 300 && resp && resp.url) {
            setSuccessMsg("上传成功");
            try {
              onUploadSuccess(resp.url);
            } catch (_cbErr) {
              // 忽略回调内部错误，避免影响上传流程
            }
            // 上传完成后重置已选择文件，但保留成功提示
            setFile(null);
            setProgress(100);
            resolve(resp.url);
          } else {
            const msg = resp?.message || `上传失败（HTTP ${status}）`;
            setErrorMsg(msg);
            resolve(null);
          }
        };

        try {
          xhr.send(form);
        } catch (_e) {
          setIsUploading(false);
          setErrorMsg("发送请求失败，请稍后再试");
          resolve(null);
        }
      });
    },
    [allowedTypes, fieldName, maxSizeBytes, maxSizeMB, onUploadSuccess]
  );

  // 文件选择变更：根据 autoUpload 决定行为
  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setErrorMsg("");
      setSuccessMsg("");
      const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
      if (!f) return;

      setFile(f);

      if (autoUpload) {
        // 通过校验后自动上传
        void doUploadWithFile(f);
        return;
      }

      // 仅选择文件，不立即上传：创建预览 URL 并回调
      try {
        const previewUrl = URL.createObjectURL(f);
        if (lastObjectUrlRef.current) {
          URL.revokeObjectURL(lastObjectUrlRef.current);
        }
        lastObjectUrlRef.current = previewUrl;
        onFileSelected?.(f, previewUrl);
      } catch (_err) {
        // 某些浏览器可能禁止 createObjectURL 的极端情况
      }
    },
    [autoUpload, doUploadWithFile, onFileSelected]
  );

  // 点击按钮：若未选择文件则直接唤起文件选择；否则执行上传
  const doUpload = useCallback(async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (isUploading) return;

    if (!file) {
      // 清空 input 的值，确保选择同一文件时也能触发 change 事件
      if (fileInputRef.current) {
        try { fileInputRef.current.value = ""; } catch { /* ignore */ }
        fileInputRef.current.click();
      }
      return;
    }

    await doUploadWithFile(file);
  }, [file, isUploading, doUploadWithFile]);

  const cancelUpload = useCallback(() => {
    if (xhrRef.current && isUploading) {
      xhrRef.current.abort();
    }
  }, [isUploading]);

  // 暴露命令式方法给父组件
  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        if (isUploading) return;
        // 当 autoUpload=false（延迟上传场景）时，无论是否已有文件，都立刻拉起选择框
        if (!autoUpload || !file) {
          if (fileInputRef.current) {
            try { fileInputRef.current.value = ""; } catch { /* ignore */ }
            fileInputRef.current.click();
          }
          return;
        }
        // autoUpload=true 且已有文件：维持原有语义，直接执行上传
        void doUploadWithFile(file);
      },
      cancel: () => {
        if (xhrRef.current && isUploading) {
          xhrRef.current.abort();
        }
      },
      uploadSelected: async () => {
        if (!file) return null;
        const url = await doUploadWithFile(file);
        return url ?? null;
      },
    }),
    [isUploading, file, doUploadWithFile, autoUpload]
  );

  return (
    <div className={className}>
      {/* 隐藏的文件选择框：仅用于程序化点击 */}
      <input
        type="file"
        accept={acceptAttr}
        onChange={handleFileChange}
        aria-label="选择要上传的文件"
        ref={fileInputRef}
        style={{ display: "none" }}
      />

      {/* 操作区 */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={doUpload}
          disabled={isUploading}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #d0d7de",
            background: isUploading ? "#f6f8fa" : "#1f6feb",
            color: isUploading ? "#8c959f" : "#ffffff",
            cursor: isUploading ? "not-allowed" : "pointer",
            transition: "transform 0.08s ease, box-shadow 0.12s ease, background 0.12s ease",
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            if (!isUploading) {
              btn.style.boxShadow = "0 4px 12px rgba(31,110,235,0.35)";
              btn.style.background = "#2a7df0";
            }
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.transform = "scale(1)";
            btn.style.boxShadow = "none";
            btn.style.background = isUploading ? "#f6f8fa" : "#1f6feb";
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
          aria-live="polite"
          aria-busy={isUploading}
        >
          {isUploading ? "上传中..." : buttonText}
        </button>

        {isUploading && (
          <button
            type="button"
            onClick={cancelUpload}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #d0d7de",
              background: "#ffffff",
              color: "#cf222e",
              cursor: "pointer",
              transition: "transform 0.08s ease, box-shadow 0.12s ease, background 0.12s ease",
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.boxShadow = "0 4px 12px rgba(207,34,46,0.2)";
              btn.style.background = "#fff2f2";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.transform = "scale(1)";
              btn.style.boxShadow = "none";
              btn.style.background = "#ffffff";
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            取消上传
          </button>
        )}
      </div>

      {/* 进度条 */}
      {isUploading && (
        <div style={{ marginTop: 10, width: "100%", maxWidth: 420 }}>
          <div
            style={{
              height: 8,
              width: "100%",
              background: "#eaeef2",
              borderRadius: 999,
              overflow: "hidden",
            }}
            aria-label="上传进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            role="progressbar"
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(Math.max(progress, 0), 100)}%`,
                background: "linear-gradient(90deg, rgba(31,110,235,1) 0%, rgba(56,139,253,1) 100%)",
                transition: "width 0.15s ease",
              }}
            />
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#57606a" }}>{progress}%</div>
        </div>
      )}

      {/* 状态消息 */}
      {errorMsg && (
        <div style={{ marginTop: 10, color: "#cf222e", fontSize: 14 }} aria-live="assertive">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ marginTop: 10, color: "#1a7f37", fontSize: 14 }} aria-live="polite">
          {successMsg}
        </div>
      )}
    </div>
  );
});

export default Uploader;