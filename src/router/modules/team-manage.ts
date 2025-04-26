import { $t } from "@/plugins/i18n";
import { teamManagement } from "@/router/enums";

export default {
  path: "/team-manage",
  redirect: "/team-manage/index",
  meta: {
    icon: "lucide:user-cog",
    title: $t("menus.teamManagement"),
    rank: teamManagement
  },
  children: [
    {
      path: "/team-manage/index",
      name: "TeamManagement",
      component: () => import("@/views/team-manage/index.vue"),
      meta: {
        title: $t("menus.teamManagement"),
        roles: ["admin", "tl"]
      }
    }
  ]
} satisfies RouteConfigsTable;
