import { $t } from "@/plugins/i18n";
import { co } from "@/router/enums";

export default {
  path: "/bos-co/index",
  meta: {
    icon: "ep/lollipop",
    title: $t("menus.co"),
    rank: co
  },
  children: [
    {
      path: "/bos-co/index",
      name: "bos-co",
      component: () => import("@/views/bos-co/index.vue"),
      meta: {
        title: $t("menus.co")
      }
    }
  ]
} satisfies RouteConfigsTable;
