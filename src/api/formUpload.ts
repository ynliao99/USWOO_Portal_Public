// src/api/formUpload.ts
import { http } from "@/utils/http";
import type { AxiosProgressEvent } from "axios";

export interface UploadMeta {
  apartmentName: string;
  roomType: string;
  address: string;
  unit?: string;
  area: string;
  target_source: string;
  target_source_label: string;
  filename: string;
  filesize: number;
}

export interface FormUploadOptions {
  file: File;
  meta: UploadMeta;
  onProgress?: (percent: number) => void;
  chunkSize?: number; // 可选，默认 5MB
}

export async function formUpload(opts: FormUploadOptions): Promise<void> {
  const {
    file,
    meta,
    onProgress = () => {},
    chunkSize = 5 * 1024 * 1024
  } = opts;

  const totalChunks = Math.ceil(file.size / chunkSize);
  const timestamp = Date.now();
  const ext = file.name.split(".").pop() || "";
  // 拼 ossFileName，跳过空 unit
  const parts = [meta.apartmentName, meta.roomType];
  if (meta.unit) parts.push(meta.unit);
  const prefix = parts.join("_") + `_${timestamp}`;
  const ossFileName = `${prefix}.${ext}`;

  // helper: 上传一个分片
  async function uploadPart(idx: number, blob: Blob) {
    const fd = new FormData();
    fd.append("file", blob);
    fd.append("ossFileName", ossFileName);
    fd.append("chunkIndex", (idx + 1).toString());
    fd.append("totalChunks", totalChunks.toString());

    // 只有最后一个请求带上所有 meta，前面的可以不带数据库字段
    if (idx === totalChunks - 1) {
      Object.entries(meta).forEach(([key, val]) => {
        fd.append(key, String(val));
      });
      // 还加上 original_oss_path
      fd.append(
        "original_oss_path",
        `未打水印房源视频/${meta.target_source}/${meta.area}/${meta.apartmentName}/${ossFileName}`
      );
    }

    await http.request(
      "post",
      "/portalapi/upload/portal_remote_upload.php",
      { data: fd },
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          const loadedThis = progressEvent.loaded ?? 0;
          const loadedAll = idx * chunkSize + loadedThis;
          const totalSize = file.size; // 使用文件的总字节数
          let percent = 0;
          if (totalSize > 0) {
            percent = Math.min(100, Math.round((loadedAll / totalSize) * 100));
          }
          onProgress(percent);
        }
      }
    );
  }

  // 逐片上传
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const blob = file.slice(start, end);
    try {
      await uploadPart(i, blob);
    } catch (error) {
      console.error(`上传分片 ${i + 1} 失败:`, error);
      // 抛出错误，让上层 try...catch 捕获
      throw new Error(`上传分片 ${i + 1} 失败`);
    }
  }

  // (可选) 确保最后报告 100%，以防万一 axios 的最后一次 progress 事件没到 100
  if (totalChunks > 0) {
    onProgress(100);
  }
}
