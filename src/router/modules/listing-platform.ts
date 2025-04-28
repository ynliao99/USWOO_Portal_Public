import Icon from "~icons/lucide/database";
import { $t } from "@/plugins/i18n";
import { listing } from "@/router/enums";

export default {
  path: "/listing-platform/index",
  meta: {
    icon: Icon,
    title: $t("menus.listing-platform"),
    rank: listing
  },
  children: [
    {
      path: "/listing-platform/index",
      name: "listing-platform",
      component: () => import("@/views/listing-platform/index.vue"),
      meta: {
        title: $t("menus.listing-platform")
      }
    }
  ]
} satisfies RouteConfigsTable;
