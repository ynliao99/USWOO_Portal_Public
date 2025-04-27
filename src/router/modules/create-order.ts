import { $t } from "@/plugins/i18n";
import { createOrder } from "@/router/enums";
import Icon from "~icons/icon-park-outline/order";

// 定义基础 URL
const frameSrc = "https://bos.uswoo.com/createOrder/";

export default {
  path: "/create-order/index",
  meta: {
    icon: Icon,
    title: $t("menus.createOrder"),
    rank: createOrder
  },
  children: [
    {
      path: "/create-order/index",
      name: "create-order",
      component: () => import("@/layout/frame.vue"),
      meta: {
        icon: Icon,
        title: $t("menus.createOrder"),
        frameLoading: false,
        useToken: true,
        // 使用上面条件构建好的 frameSrc
        frameSrc: frameSrc
      }
    }
  ]
} satisfies RouteConfigsTable;
