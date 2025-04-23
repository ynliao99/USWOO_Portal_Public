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
        title: $t("menus.driveUpload")
      }
    },
    {
      path: "/drive/video-list",
      name: "video-list",
      component: () => import("@/views/drive/video-list.vue"),
      meta: {
        title: $t("menus.driveList")
      }
    },
    {
      path: "/drive/view",
      name: "video-view",
      component: () => import("@/views/drive/view.vue"),
      meta: {
        title: $t("menus.driveView")
      }
    }
  ]
} satisfies RouteConfigsTable;
