import { $t } from "@/plugins/i18n";
import { drive } from "@/router/enums";
import UploadIcon from "~icons/mdi/cloud-upload-outline";
import MenuIcon from "~icons/ri/hard-drive-3-line";
import DriveIcon from "~icons/mdi/movie-open-play-outline";

import MyIcon from "~icons/material-symbols/drive-file-move-outline-rounded";

export default {
  path: "/drive",
  meta: {
    icon: MenuIcon,
    title: $t("menus.drive"),
    rank: drive
  },
  children: [
    {
      path: "/drive/index",
      name: "drive-index",
      component: () => import("@/views/drive/index.vue"),
      meta: {
        icon: UploadIcon,
        title: $t("menus.driveUpload")
      }
    },
    {
      path: "/drive/video-list",
      name: "video-list",
      component: () => import("@/views/drive/video-list.vue"),
      meta: {
        icon: DriveIcon,
        title: $t("menus.driveList")
      }
    },
    {
      path: "/drive/view",
      name: "video-view",
      component: () => import("@/views/drive/view.vue"),
      meta: {
        icon: MyIcon,
        title: $t("menus.driveView")
      }
    }
  ]
} satisfies RouteConfigsTable;
