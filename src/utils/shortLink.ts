// src/utils/shortLink.ts
import { http } from "@/utils/http";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";

interface ApiResponse {
  success: boolean;
  shortUrl?: string;
  message?: string;
}

/**
 * 生成短链并复制到剪贴板，失败时提示用户手动复制。
 * @param originalUrl 要缩短的原始链接
 */
export async function generateShortLink(originalUrl: string): Promise<void> {
  try {
    // 请求生成短链
    const res = await http.request<ApiResponse>(
      "post",
      "/uswooapi/dwz/requeust.php?action=generate",
      { data: { original: originalUrl } }
    );

    if (!res.success || !res.shortUrl) {
      message(`生成短链失败：${res.message || "未知错误"}`, { type: "error" });
      return;
    }
    const shortUrl = res.shortUrl;

    // 尝试复制到剪贴板
    try {
      await navigator.clipboard.writeText(shortUrl);
      message("链接已复制到剪贴板", { type: "success" });
    } catch {
      // 复制失败，要求用户手动复制
      await ElMessageBox.confirm(
        `<span style=\"word-break:break-all;\">${shortUrl}</span>`,
        "请手动复制链接",
        {
          dangerouslyUseHTMLString: true,
          confirmButtonText: "复制链接",
          cancelButtonText: "取消"
        }
      );
      // 用户确认后执行手动复制
      const input = document.createElement("input");
      input.value = shortUrl;
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand("copy");
        message("链接已复制到剪贴板", { type: "success" });
      } catch {
        message("复制失败，请手动复制", { type: "warning" });
      }
      document.body.removeChild(input);
    }
  } catch {
    message("请求错误，请稍后再试。", { type: "error" });
  }
}
