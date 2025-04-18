import { $t } from "@/plugins/i18n";
import { aptInfo } from "@/router/enums";

export default {
  path: "/apt-info/index",
  meta: {
    icon: "ep/lollipop",
    title: $t("menus.apt-info"),
    rank: aptInfo
  },
  children: [
    {
      path: "/apt-info/index",
      name: "apt-info",
      component: () => import("@/views/apt-info/index.vue"),
      meta: {
        title: $t("menus.apt-info")
      }
    }
  ]
} satisfies RouteConfigsTable;
