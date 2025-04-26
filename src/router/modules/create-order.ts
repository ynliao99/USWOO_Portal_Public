import { $t } from "@/plugins/i18n";
import { createOrder } from "@/router/enums";
import Icon from "~icons/icon-park-outline/order";
import { getToken } from "@/utils/auth";

// 首先获取 token
const token = getToken();

// 定义基础 URL
let frameSrc = "https://bos.uswoo.com/createOrder/";

// 检查 token 是否存在并且有 accessToken 属性
if (token && token.accessToken) {
  // 如果条件满足，则附加 token 参数
  frameSrc += "?token=" + token.accessToken;
}

export default {
  path: "/create-order/index",
  meta: {
    icon: Icon,
    title: $t("menus.createOrder"),
    rank: createOrder
  },
  children: [
    // {
    //   path: "/create-order/index",
    //   name: "create-order",
    //   component: () => import("@/views/create-order/index.vue"),
    //   meta: {
    //     title: $t("menus.createOrder")
    //   }
    // },
    {
      path: "/create-order/index",
      name: "create-order",
      component: () => import("@/layout/frame.vue"),
      meta: {
        icon: Icon,
        title: $t("menus.createOrder"),
        // 使用上面条件构建好的 frameSrc
        frameSrc: frameSrc
      }
    }
  ]
} satisfies RouteConfigsTable;
