import { http } from "@/utils/http"; 
import { message } from "@/utils/message";

export interface FetchAreasResponse {
  areas: string[];
}

export async function fetchAreas(targetRef: { value: string[] }) {
  try {
    const res = await http.request<FetchAreasResponse>(
      "get",
      "/portalapi/bos_public/areas.json"
    );
    if (res.areas && Array.isArray(res.areas)) {
      targetRef.value = res.areas;
    }
  } catch {
    message("获取区域数据异常", { type: "warning" });
  }
}
