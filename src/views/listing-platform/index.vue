<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 p-8 transition-colors duration-300"
  >
    <h1
      class="text-center text-3xl font-bold text-gray-800 dark:text-gray-100 mb-12"
    >
      房源平台快速访问
    </h1>
    <div
      class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8"
    >
      <div
        v-for="platform in platforms"
        :key="platform.id"
        class="card-container group bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl cursor-pointer border border-transparent hover:border-blue-500 dark:hover:border-blue-400 flex flex-col"
        :aria-label="`跳转至 ${platform.name}`"
        @click="submitPlatformForm(platform.id)"
      >
        <div class="p-6 flex flex-col items-center text-center flex-1">
          <div
            class="h-20 w-full flex items-center justify-center mb-5 overflow-hidden"
          >
            <img
              :src="platform.logo"
              :alt="`${platform.name} Logo`"
              class="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-110 dark:brightness-0 dark:invert-[.9] dark:contrast-200"
              loading="lazy"
            />
          </div>

          <h2
            class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2"
          >
            {{ platform.name }}
          </h2>

          <div class="flex-grow" />

          <div class="w-full mt-4">
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3 px-4">
              点击将自动登录并跳转至平台 (新窗口)
            </p>
            <div class="flex justify-center items-center h-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-full w-6 text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <form
      v-for="platform in platforms"
      :id="`${platform.id}PostForm`"
      :key="`form-${platform.id}`"
      :ref="el => assignFormRef(el, platform.id)"
      :action="platform.actionUrl"
      :method="platform.method"
      :target="platform.target"
      style="display: none"
    >
      <input
        v-for="field in platform.fields"
        :key="field.name"
        type="hidden"
        :name="field.name"
        :value="field.value"
      />
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, ComponentPublicInstance } from "vue";
import { ElMessageBox } from "element-plus";
// 类型定义 (可选，但推荐)
interface FormField {
  name: string;
  value: string;
}

interface Platform {
  id: string;
  name: string;
  logo: string; // URL or path to logo
  actionUrl: string;
  method: "post"; // Always POST in this case
  target: "_blank"; // Always _blank
  fields: FormField[];
}

// 使用 reactive 存储动态引用的表单元素
const formRefs = reactive<Record<string, HTMLFormElement | null>>({});

// 函数用于在 v-for 中设置 ref
const assignFormRef = (
  el: Element | ComponentPublicInstance | null,
  platformId: string
) => {
  // 保持 instanceof 检查，确保我们只存储正确的元素类型
  if (el instanceof HTMLFormElement) {
    formRefs[platformId] = el;
  } else {
    // 可选：处理元素卸载时 el 为 null 的情况，或 ref 错误地放在组件上的情况
    if (el === null && formRefs[platformId]) {
      // 如果元素卸载了，可以清空引用（尽管在这个场景下表单通常不会动态卸载）
      formRefs[platformId] = null;
    }
    // console.warn(`Ref for ${platformId} is not an HTMLFormElement:`, el);
  }
};

// 平台数据
const platforms = ref<Platform[]>([
  {
    id: "hamilton",
    name: "The Hamilton Company",
    // 临时使用 Clearbit 获取 Logo，可以替换为本地路径或官方 URL
    logo: "https://logo.clearbit.com/thehamiltoncompany.com",
    actionUrl:
      "https://bp.thehamiltoncompany.com/announcements?destination=announcements",
    method: "post",
    target: "_blank",
    fields: [
      { name: "name", value: "hooli" },
      { name: "pass", value: "Hooli2022!" },
      { name: "form_id", value: "user_login_block" },
      { name: "op", value: "Log in" }
    ]
  },
  {
    id: "fineberg",
    name: "Fineberg Companies",
    logo: "/assets/listing/fblogo.png",
    actionUrl: "http://list.finebergcompanies.com/",
    method: "post",
    target: "_blank",
    fields: [
      { name: "txtUsername", value: "nextgen" },
      { name: "txtPassword", value: "TrueLeaders1" },
      { name: "btnLogin", value: "Login" },
      {
        name: "__VIEWSTATE",
        value:
          "/wEPDwUJLTUzMDIwNzI1ZGQUBXfUR0aKic2RB0Idjf8rs8AnzR4b5/yx/0QAacmZJw=="
      },
      { name: "__VIEWSTATEGENERATOR", value: "CA0B0334" },
      {
        name: "__EVENTVALIDATION",
        value:
          "/wEdAAQTTSPVXK5+mIaktNgxYu7gVK7BrRAtEiqu9nGFEI+jB3Y2+Mc6SrnAqio3oCKbxYainihG6d/Xh3PZm3b5AoMQmSYKK2Ga8VIPP26fMDIY3iwyVVVzXoFMLDp60yVtJqE="
      }
    ]
  },
  {
    id: "ygl",
    name: "You Got Listings",
    logo: "https://app.yougotlistings.com/images/logo.svg",
    actionUrl: "https://app.yougotlistings.com/login",
    method: "post",
    target: "_blank",
    fields: [
      { name: "username", value: "uswooteam" },
      { name: "password", value: "Cl0seM0re2023$" },
      { name: "loginSubmit", value: "" }
    ]
  }
]);

// 点击卡片触发表单提交
const submitPlatformForm = (platformId: string) => {
  const formElement = formRefs[platformId];
  if (formElement) {
    if (platformId === "hamilton") {
      ElMessageBox.confirm(
        "你即将前往Hamilton Portal，请注意：跳转后登录的账号并非本公司账号，你不能直接在跳转后的界面预约钥匙！如果需要安排Hamilton的看房，必须与组长联系！请确认你已清楚本信息。",
        "提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        }
      )
        .then(() => {
          // 仅在用户确认后提交
          console.log(`Submitting form for platform: ${platformId}`);
          formElement.submit();
        })
        .catch(() => {
          // 用户取消，不做任何事
          console.log("User cancelled the Hamilton submission.");
        });
    } else {
      // 其他平台直接提交
      console.log(`Submitting form for platform: ${platformId}`);
      formElement.submit();
    }
    // --- 移除这里的重复提交 ---
    // console.log(`Submitting form for platform: ${platformId}`); // 重复日志
    // formElement.submit(); // <<<--- 这个是多余的，会导致重复提交或逻辑混乱，必须删除
  } else {
    console.error(`Form element not found for platform: ${platformId}`);
    // 可以添加用户提示
  }
};
</script>

<style scoped>
/* 添加一些额外的自定义样式（如果需要） */
.card-container:hover img {
  /* filter: brightness(1.1); 可选：悬停时让 logo 亮一点 */
}

/* 为暗色模式下的 logo 做适配 (如果 logo 本身是深色的) */
.dark .card-container img {
  /* filter: invert(1) brightness(1.5); 根据需要调整 */
}

.bg-gradient-to-br::before {
  position: absolute;
  inset: 0;
  z-index: 0;
  content: "";
  background-image: url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23cbd5e1' fill-opacity='0.08'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  background-repeat: repeat;
  opacity: 0.5;
}

.dark .bg-gradient-to-br::before {
  background-image: url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23475569' fill-opacity='0.1'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

/* 确保内容在伪元素之上 */

/* .max-w-7xl {
  position: relative;
  z-index: 1;
} */
</style>
