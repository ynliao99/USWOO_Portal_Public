import { http } from "@/utils/http";
import { message } from "@/utils/message";
import type { Ref } from "vue";

export interface SelectOption {
  label: string;
  value: string;
  owner?: string;
  level_index?: number;
}

interface LoadTargetSourcesResponse {
  status: "success" | string;
  data: Array<{
    target_source: string;
    display_name: string;
    owner?: string;
    level_index?: number;
  }>;
}

/**
 * 加载“我的盘” & “团队盘”选项
 */
export async function loadTargetSources(targetRef: Ref<SelectOption[]>) {
  try {
    const res = await http.request<LoadTargetSourcesResponse>(
      "get",
      "/portalapi/portal_support/get_leader_tree.php"
    );
    if (res.status === "success" && Array.isArray(res.data)) {
      targetRef.value = res.data.map(item => ({
        label: item.display_name,
        value: item.target_source,
        owner: item.owner
      }));
    } else {
      console.warn("loadTargetSources 后端返回非 success：", res);
      message(`加载上传目的地失败：${res.status}`, { type: "warning" });
    }
  } catch (err: any) {
    // 把异常内容也打印/提示出来，方便定位
    console.error("loadTargetSources 出错了：", err);
    message(`加载上传目的地异常：${err.message || err}`, { type: "warning" });
  }
}

interface LoadPublicTargetSourcesResponse {
  status: "success" | string;
  data: Array<{
    target_source: string;
    display_name: string;
    owner?: string;
    level_index?: number;
  }>;
}

/**
 * 加载“公共路径”选项
 */
export async function loadPublicTargetSources(targetRef: Ref<SelectOption[]>) {
  try {
    const res = await http.request<LoadPublicTargetSourcesResponse>(
      "get",
      "/portalapi/upload/get_public_path.php"
    );
    if (res.status === "success" && Array.isArray(res.data)) {
      targetRef.value = res.data.map(item => ({
        label: item.display_name,
        value: item.target_source
      }));
    } else {
      console.warn("loadTargetSources 后端返回非 success：", res);
      message(`加载上传目的地失败：${res.status}`, { type: "warning" });
    }
  } catch (err: any) {
    console.error("loadTargetSources 出错了：", err);
    message(`加载上传目的地异常：${err.message || err}`, { type: "warning" });
  }
}

/**
 * 加载“白名单路径”选项
 */

export async function loadWhiteListTargetSources(targetRef: Ref<SelectOption[]>) {
  try {
    const res = await http.request<LoadPublicTargetSourcesResponse>(
      "get",
      "/portalapi/upload/?action=getWhiteListDrive"
    );
    if (res.status === "success" && Array.isArray(res.data)) {
      targetRef.value = res.data.map(item => ({
        label: item.display_name,
        value: item.target_source
      }));
    } else {
      console.warn("loadWhiteListTargetSources 后端返回非 success：", res);
      message(`加载上传目的地失败：${res.status}`, { type: "warning" });
    }
  } catch (err: any) {
    console.error("loadWhiteListTargetSources 出错了：", err);
    message(`加载上传目的地异常：${err.message || err}`, { type: "warning" });
  }
}