import { $t } from "@/plugins/i18n";
import { customer } from "@/router/enums";
import Icon from "~icons/mdi/office-building-marker-outline";

export default {
  path: "/customer/index",
  meta: {
    icon: Icon,
    title: $t("menus.customer"),
    rank: customer
  },
  children: [
    {
      path: "/customer/index",
      name: "customer",
      component: () => import("@/views/customer/index.vue"),
      meta: {
        title: $t("menus.customer")
      }
    }
  ]
} satisfies RouteConfigsTable;
