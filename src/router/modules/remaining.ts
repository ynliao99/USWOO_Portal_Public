import { $t } from "@/plugins/i18n";
const Layout = () => import("@/layout/index.vue");
import DashBoardIcon from "~icons/mdi/view-dashboard";
export default [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/login/index.vue"),
    meta: {
      title: $t("menus.pureLogin"),
      showLink: false,
      rank: 101
    }
  },
  {
    path: "/redirect",
    component: Layout,
    meta: {
      title: $t("status.pureLoad"),
      showLink: false,
      rank: 102
    },
    children: [
      {
        path: "/redirect/:path(.*)",
        name: "Redirect",
        component: () => import("@/layout/redirect.vue")
      }
    ]
  },
  // 下面是一个无layout菜单的例子（一个全屏空白页面），因为这种情况极少发生，所以只需要在前端配置即可（配置路径：src/router/modules/remaining.ts）
  {
    path: "/empty",
    name: "Empty",
    component: () => import("@/views/empty/index.vue"),
    meta: {
      title: $t("menus.pureEmpty"),
      showLink: false,
      rank: 103
    }
  },
  {
    path: "/anythingtodashboard",
    name: "https://portal.uswoo.cn/#/dashboard/index",
    meta: {
      title: $t("menus.dashboard"),
      icon: DashBoardIcon,
      rank: 36
    }
  },
  {
    path: "/qyautologin",
    name: "qyAutoLogin",
    component: () => import("@/views/qy-auto-login/index.vue"),
    meta: {
      title: $t("menus.qyAtudoLogin"),
      showLink: false,
      rank: 203
    }
  },
  {
    path: "/dashboard/index",
    name: "dashboard",
    component: () => import("@/views/dashboard/index.vue"),
    meta: {
      title: $t("menus.dashboard"),
      rank: 114,
      icon: DashBoardIcon,
      showLink: false
    }
  },
  {
    path: "/account-settings",
    name: "AccountSettings",
    component: () => import("@/views/account-settings/index.vue"),
    meta: {
      title: $t("buttons.pureAccountSettings"),
      showLink: false,
      rank: 104
    }
  }
] satisfies Array<RouteConfigsTable>;
