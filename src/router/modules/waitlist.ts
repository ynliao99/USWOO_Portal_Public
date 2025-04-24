import { $t } from "@/plugins/i18n";
import { waitlist } from "@/router/enums";
import Icon from "~icons/ic/outline-monitor-heart"
export default {
  path: "/waitlist",
  redirect: "/waitlist/index",
  meta: {
    icon: Icon,
    title: $t("menus.pureWaitlist"),
    rank: waitlist
  },
  children: [
    {
      path: "/waitlist/index",
      name: "Waitlist",
      component: () => import("@/views/waitlist/index.vue"),
      meta: {
        title: $t("menus.pureWaitlist")
      }
    }
  ]
} satisfies RouteConfigsTable;
