"use client";
/**
 * 组件：Uploader（通用文件上传）
 * 作用：
 *  - 渲染文件选择框与上传按钮
 *  - 前端预校验（文件类型与大小）
 *  - 显示上传中的加载与进度
 *  - 调用后端 POST /api/upload 接口（附带 Authorization: Bearer <token>）
 *  - 上传成功后通过 onUploadSuccess(url) 将文件URL回传给父组件
 * 
 * 使用示例：
 *  <Uploader onUploadSuccess={(url) => setImageUrl(url)} />
 *  可选参数：
 *   - allowedTypes?: string[]  默认 ['image/jpeg','image/png']
 *   - maxSizeMB?: number       默认 5（MB）
 *   - buttonText?: string      默认 '上传'
 *   - className?: string       外层容器自定义样式类
 *   - fieldName?: string       表单字段名，默认 'file'（需与后端保持一致）
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import { requireSupabaseClient } from "@/lib/supabase";

interface UploaderProps {
  onUploadSuccess: (url: string) => void;
  allowedTypes?: readonly string[];
  maxSizeMB?: number;
  buttonText?: string;
  className?: string;
  fieldName?: string;
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

const DEFAULT_TYPES = ["image/jpeg", "image/png"] as const;
const DEFAULT_MAX_MB = 5;

export default function Uploader({
  onUploadSuccess,
  allowedTypes = DEFAULT_TYPES,
  maxSizeMB = DEFAULT_MAX_MB,
  buttonText = "上传",
  className,
  fieldName = "file",
}: UploaderProps) {
  // 选择的文件
  const [file, setFile] = useState<File | null>(null);
  // 进度 0-100
  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const acceptAttr = useMemo(() => allowedTypes.join(","), [allowedTypes]);
  const maxSizeBytes = useMemo(() => maxSizeMB * 1024 * 1024, [maxSizeMB]);

  // 文件选择变更：预校验
  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setErrorMsg("");
      setSuccessMsg("");
      const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
      setFile(f);

      if (!f) return;

      // 类型校验
      if (!allowedTypes.includes(f.type)) {
        setErrorMsg("不支持的文件类型，仅允许：" + allowedTypes.join(", "));
        setFile(null);
        return;
      }

      // 大小校验
      if (f.size <= 0 || f.size > maxSizeBytes) {
        setErrorMsg(`文件大小超出限制（最大 ${maxSizeMB}MB）`);
        setFile(null);
        return;
      }
    },
    [allowedTypes, maxSizeBytes, maxSizeMB]
  );

  const doUpload = useCallback(async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!file) {
      setErrorMsg("请先选择文件");
      return;
    }

    // 再次前置校验，防止选择后文件被替换
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg("不支持的文件类型，仅允许：" + allowedTypes.join(", "));
      return;
    }
    if (file.size <= 0 || file.size > maxSizeBytes) {
      setErrorMsg(`文件大小超出限制（最大 ${maxSizeMB}MB）`);
      return;
    }

    // 获取 Supabase 会话，准备 Authorization 头
    let token = "";
    try {
      const supabase = requireSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      token = sessionData?.session?.access_token ?? "";
    } catch (_err) {
      // 若 Supabase 未配置或未初始化
      setErrorMsg(
        "无法获取登录状态，请检查前端环境变量或先登录后再尝试上传"
      );
      return;
    }

    if (!token) {
      setErrorMsg("未登录或登录已过期，请先登录");
      return;
    }

    // 通过 XHR 实现上传进度
    const form = new FormData();
    form.append(fieldName, file);

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
        onUploadSuccess(resp.url);
        // 上传完成后重置已选择文件，但保留成功提示
        setFile(null);
        setProgress(100);
      } else {
        const msg = resp?.message || `上传失败（HTTP ${status}）`;
        setErrorMsg(msg);
      }
    };

    try {
      xhr.send(form);
    } catch (_e) {
      setIsUploading(false);
      setErrorMsg("发送请求失败，请稍后再试");
    }
  }, [allowedTypes, file, fieldName, maxSizeBytes, maxSizeMB, onUploadSuccess]);

  const cancelUpload = useCallback(() => {
    if (xhrRef.current && isUploading) {
      xhrRef.current.abort();
    }
  }, [isUploading]);

  return (
    <div className={className}>
      {/* 文件选择 */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="file"
          accept={acceptAttr}
          onChange={handleFileChange}
          aria-label="选择要上传的文件"
          disabled={isUploading}
        />
        <button
          type="button"
          onClick={doUpload}
          disabled={isUploading || !file}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #d0d7de",
            background: isUploading || !file ? "#f6f8fa" : "#1f6feb",
            color: isUploading || !file ? "#8c959f" : "#ffffff",
            cursor: isUploading || !file ? "not-allowed" : "pointer",
            transition: "transform 0.08s ease, box-shadow 0.12s ease, background 0.12s ease",
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            if (!(isUploading || !file)) {
              btn.style.boxShadow = "0 4px 12px rgba(31,110,235,0.35)";
              btn.style.background = "#2a7df0";
            }
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.transform = "scale(1)";
            btn.style.boxShadow = "none";
            btn.style.background = isUploading || !file ? "#f6f8fa" : "#1f6feb";
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
}