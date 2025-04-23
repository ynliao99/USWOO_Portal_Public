// src/api/driveFecthApartmentAI.ts
import { reactive, ref } from "vue";
import { http } from "@/utils/http";

export interface ApartmentInfo {
  name?: string;
  unit?: string;
  area?: string;
  type?: string;
}

export function useApartmentLookup() {
  const info = reactive<ApartmentInfo>({
    name: "",
    unit: "",
    area: "",
    type: ""
  });
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * 根据文件名（去掉后缀）去查询公寓信息
   */
  async function lookup(baseName: string) {
    loading.value = true;
    error.value = null;
    try {
      // 构造 form-urlencoded 字符串
      const body = `file_name_input=${encodeURIComponent(baseName)}`;

      // 直接把字符串当 data 传进去，并指定 Content-Type
      const res = await http.request<{
        status: string;
        name: string;
        unit: string;
        area: string;
        type: string;
      }>(
        "post",
        "/uswooapi/filename/hunyuan.php",
        { data: body },
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      if (res.status === "success") {
        info.name = res.name;
        info.unit = res.unit;
        info.area = res.area;
        info.type = res.type;
      } else {
        error.value = `接口返回状态：${res.status}`;
      }
    } catch (e: any) {
      error.value = e.message || "请求出错";
    } finally {
      loading.value = false;
    }
  }

  /**
   * 根据公寓名称校验并返回区域信息
   */
  async function checkApartmentName(apartmentName: string) {
    loading.value = true;
    error.value = null;
    try {
      apartmentName = apartmentName.replace(/'/g, "");
      const body = `apartmentName=${encodeURIComponent(apartmentName)}`;

      const res = await http.request<{ status: string; area: string }>(
        "post",
        "/portalapi/upload/?action=checkAPT",
        { data: body },
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      if (res.status === "success") {
        info.area = res.area;
      } else {
        error.value = `校验失败，状态：${res.status}`;
      }
    } catch (e: any) {
      error.value = e.message || "请求出错";
    } finally {
      loading.value = false;
    }
  }

  return { info, loading, error, lookup, checkApartmentName };
}
