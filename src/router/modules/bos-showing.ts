import { $t } from "@/plugins/i18n";
import { showing } from "@/router/enums";

export default {
  path: "/bos-showing",
  meta: {
    icon: "ep/lollipop",
    title: $t("menus.pureShowing"),
    rank: showing
  },
  children: [
    {
      path: "/bos-showing/index",
      name: "bos-showing",
      component: () => import("@/views/bos-showing/index.vue"),
      meta: {
        title: $t("menus.pureShowing")
      }
    },
    {
      path: "/bos-showing/calendar",
      name: "bos-calendar",
      component: () => import("@/layout/frame.vue"),
      meta: {
        title: $t("menus.calendar"),
        frameSrc: "https://portal.uswoo.cn/agent/calendar/calendar.html"
      }
    }
  ]
} satisfies RouteConfigsTable;
