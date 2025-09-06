/**
 * 后端API：通用文件上传（Edge Runtime）
 * 功能：
 *  - 仅允许已登录用户上传图片（验证 Authorization: Bearer <token>）
 *  - 解析 multipart/form-data，读取字段名为 "file" 的文件
 *  - 服务器端安全校验：限制文件类型（image/jpeg、image/png）与大小（<= 5MB）
 *  - 通过 AWS SigV4 签名 + fetch 方式将对象上传到 Cloudflare R2（避免在 Edge Runtime 中使用 @aws-sdk/client-s3 导致的打包问题）
 *  - 返回公开可访问的 URL
 *  - 必需环境变量：R2_ACCOUNT_ID、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_BUCKET_NAME、R2_ENDPOINT
 *  - 可选环境变量（统一从 getR2EnvVars 中获取）：
 *      - R2_PUBLIC_URL：配置了 R2 自定义域（直接指向某个 bucket）时使用，拼接方式为 `${R2_PUBLIC_URL}/${key}`（不再拼接 bucket 前缀）
 *      - R2_PUBLIC_BASE_URL：自定义公开基址（例如 CDN 域名），拼接方式为 `${R2_PUBLIC_BASE_URL}/${bucket}/${key}`
 *      - 若以上均未配置，则回退到 r2.dev 公网域名：`https://pub-${R2_ACCOUNT_ID}.r2.dev/${bucket}/${key}`
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEnvVars, getR2EnvVars } from '@/lib/env'

export const runtime = 'edge'

// 允许的MIME类型与大小限制
const ALLOWED_TYPES = new Set<string>(['image/jpeg', 'image/png'])
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

// 工具：生成随机十六进制串（用于文件名）
function randomHex(bytes = 8): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// 根据 MIME 类型推断合适的扩展名
function extFromMime(mime: string): 'jpg' | 'png' {
  if (mime === 'image/jpeg') return 'jpg'
  return 'png'
}

// --- 以下为 AWS SigV4 辅助函数（适配 Cloudflare Workers / Edge Runtime 的 WebCrypto）---
const encoder = new TextEncoder()

async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const ab = data instanceof Uint8Array ? data : new Uint8Array(data)
  const digest = await crypto.subtle.digest('SHA-256', ab)
  return toHex(new Uint8Array(digest))
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string | Uint8Array): Promise<ArrayBuffer> {
  const k = key instanceof Uint8Array ? key : new Uint8Array(key)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    k,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const msg = typeof data === 'string' ? encoder.encode(data) : data
  return crypto.subtle.sign('HMAC', cryptoKey, msg)
}

async function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmac(encoder.encode('AWS4' + secretKey), dateStamp)
  const kRegion = await hmac(kDate, region)
  const kService = await hmac(kRegion, service)
  const kSigning = await hmac(kService, 'aws4_request')
  return kSigning
}

function amzDates(date = new Date()) {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const HH = String(date.getUTCHours()).padStart(2, '0')
  const MM = String(date.getUTCMinutes()).padStart(2, '0')
  const SS = String(date.getUTCSeconds()).padStart(2, '0')
  const dateStamp = `${yyyy}${mm}${dd}`
  const amzDate = `${dateStamp}T${HH}${MM}${SS}Z`
  return { dateStamp, amzDate }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1) 读取并校验 Supabase 与 R2 的环境变量
    const { supabaseUrl, serviceRoleKey } = getEnvVars()
    const { r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2BucketName, r2Endpoint, r2PublicUrl, r2PublicBaseUrl } = getR2EnvVars()

    // 2) 校验认证：Authorization: Bearer <token>
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未授权，缺少认证令牌' }, { status: 401 })
    }

    // 使用 service_role 校验令牌并获取用户ID
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data: authData, error: authErr } = await supabase.auth.getUser(token)
    const userId = authData?.user?.id
    if (authErr || !userId) {
      return NextResponse.json({ message: '认证令牌无效或已过期' }, { status: 401 })
    }

    // 3) 解析 multipart/form-data
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ message: '未找到上传文件字段：file' }, { status: 400 })
    }

    // 4) 服务器端安全校验
    const mime = file.type
    const size = file.size
    if (!ALLOWED_TYPES.has(mime)) {
      return NextResponse.json({ message: '不支持的文件类型，仅允许 image/jpeg 与 image/png' }, { status: 400 })
    }
    if (size <= 0 || size > MAX_SIZE_BYTES) {
      return NextResponse.json({ message: '文件大小超出限制（最大 5MB）' }, { status: 400 })
    }

    // 5) 生成唯一文件名与Key
    const ext = extFromMime(mime)
    const now = Date.now()
    const nonce = randomHex(8)
    // 通用存放路径：uploads/images/<userId>/<timestamp>_<rand>.<ext>
    const key = `uploads/images/${userId}/${now}_${nonce}.${ext}`

    // 6) 通过 SigV4 + fetch 上传到 R2（Path-Style: <endpoint>/<bucket>/<key>）
    const { amzDate, dateStamp } = amzDates()
    const region = 'auto'
    const service = 's3'

    const url = new URL(`/${r2BucketName}/${key}`, r2Endpoint)
    const host = url.host

    const arrayBuf = await file.arrayBuffer()
    const body = new Uint8Array(arrayBuf)
    const payloadHash = await sha256Hex(body)

    // 参与签名的 headers（全部小写排序）
    const canonicalHeaders = `content-type:${mime}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'

    // Canonical Request
    const canonicalRequest = [
      'PUT',
      `/${r2BucketName}/${key}`,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')

    const hashedCanonicalRequest = await sha256Hex(encoder.encode(canonicalRequest))

    // StringToSign
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      hashedCanonicalRequest,
    ].join('\n')

    // Signature
    const signingKey = await getSignatureKey(r2SecretAccessKey, dateStamp, region, service)
    const signatureBytes = new Uint8Array(await hmac(signingKey, stringToSign))
    const signature = toHex(signatureBytes)

    const authorization = `AWS4-HMAC-SHA256 Credential=${r2AccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    const putRes = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Authorization': authorization,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Content-Type': mime,
        // 注意：R2 公共访问通常通过 r2.dev 或自定义域配置，而非对象级 ACL
      },
      body,
    })

    if (!putRes.ok) {
      const txt = await putRes.text().catch(() => '')
      return NextResponse.json({ message: '上传失败', details: `R2返回状态码：${putRes.status}`, body: txt }, { status: 502 })
    }

    // 7) 生成公开URL（优先使用 r2PublicUrl -> r2PublicBaseUrl -> r2.dev）
    let publicUrl: string
    if (r2PublicUrl) {
      publicUrl = `${r2PublicUrl.replace(/\/$/, '')}/${key}`
    } else if (r2PublicBaseUrl) {
      publicUrl = `${r2PublicBaseUrl.replace(/\/$/, '')}/${r2BucketName}/${key}`
    } else {
      publicUrl = `https://pub-${r2AccountId}.r2.dev/${r2BucketName}/${key}`
    }

    return NextResponse.json({
      message: '上传成功',
      url: publicUrl,
      bucket: r2BucketName,
      key,
      contentType: mime,
      size,
    }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ message: '服务器内部错误', error: msg }, { status: 500 })
  }
}