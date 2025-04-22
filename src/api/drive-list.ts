import { http } from "@/utils/http";

type Result = {
  status: "success" | "error";
  data?: {
    /** 列表数据 */
    list: Array<any>;
    token: string;
    status: string;
    message?: string;
  };
};

/** 卡片列表 */
export const getCardList = (data?: object) => {
  return http.request<Result>("post", "/portalapi/upload/?action=list", {
    data
  });
};
