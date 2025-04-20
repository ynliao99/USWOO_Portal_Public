import { $t } from "@/plugins/i18n";
import { drive } from "@/router/enums";

export default {
  path: "/drive",
  meta: {
    icon: "ep/lollipop",
    title: $t("menus.drive"),
    rank: drive
  },
  children: [
    {
      path: "/drive/index",
      name: "drive-index",
      component: () => import("@/views/drive/index.vue"),
      meta: {
        title: $t("menus.pureShowing")
      }
    },
    {
      path: "/drive/video-list",
      name: "video-list",
      component: () => import("@/views/drive/video-list.vue"),
      meta: {
        title: $t("menus.driveList")
      }
    }
  ]
} satisfies RouteConfigsTable;
