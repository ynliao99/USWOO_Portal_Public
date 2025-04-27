<script setup lang="ts">
import { computed } from "vue";
import { useColumns } from "./columns";

export interface schemaItem {
  field: string;
  label: string;
}

defineOptions({
  name: "About"
});

const { pkg } = __APP_INFO__;
const { dependencies, devDependencies } = pkg;

const schema: schemaItem[] = [];
const devSchema: schemaItem[] = [];

const { columns } = useColumns();

const words = [
  "@pureadmin/descriptions",
  "@pureadmin/table",
  "@pureadmin/utils",
  "@vueuse/core",
  "axios",
  "dayjs",
  "echarts",
  "vue",
  "element-plus",
  "pinia",
  "vue-i18n",
  "vue-router",
  "@iconify/vue",
  "@vitejs/plugin-vue",
  "@vitejs/plugin-vue-jsx",
  "eslint",
  "prettier",
  "sass",
  "stylelint",
  "tailwindcss",
  "typescript",
  "vite",
  "vue-tsc"
];

const getMainLabel = computed(
  () => (label: string) => words.find(w => w === label) && "main-label"
);

Object.keys(dependencies).forEach(key => {
  schema.push({ field: dependencies[key], label: key });
});

Object.keys(devDependencies).forEach(key => {
  devSchema.push({ field: devDependencies[key], label: key });
});
</script>

<template>
  <div>
    <el-card class="mb-4 box-card" shadow="never">
      <span>
        USWOO Empolyee Portal 基于 PureAdmin 框架开发。 vue-pure-admin
        是一款开源免费且开箱即用的中后台管理系统模版。完全采用 ECMAScript
        模块（ESM）规范来编写和组织代码，使用了最新的
        Vue3、Vite、Element-Plus、TypeScript、Javascript、Pinia、Tailwindcss
        等主流技术开发。
        <br />
        后端技术栈采用PHP8.4、MySQL8.0、Redis7.0、Nginx1.2，属自行搭建的API，计划未来使用主流框架规范。
        <br />
        我们采取了多项行业标准的安全技术和措施来保护你的信息。本站部署了有效的机制来防御常见的网络攻击，例如跨站脚本攻击（XSS）和SQL注入，以确保你与网站交互的安全性以及我们数据库的完整性。同时，本站使用HTTPS加密传输（SSL/TLS）来保护你的数据在传输过程中的机密性。本站实施安全有效的身份验证机制，全部HRM交互均通过HRM原生接口使用JWT
        Token进行身份验证，确保只有经过授权的用户才能访问敏感信息。
      </span>
    </el-card>

    <el-card class="m-4 box-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="font-medium">平台信息</span>
        </div>
      </template>
      <el-scrollbar>
        <PureDescriptions border :columns="columns" :column="4" />
      </el-scrollbar>
    </el-card>

    <el-card class="m-4 box-card" shadow="never">
      <template #header>
        <div class="card-header flex items-center">
          <span class="font-medium">生产环境依赖 (使用中)</span>
          <el-tag type="primary" effect="dark" size="small" round class="ml-1">
            {{ schema.length }}
          </el-tag>
        </div>
      </template>
      <el-scrollbar>
        <el-descriptions border size="small" :column="6">
          <el-descriptions-item
            v-for="(item, index) in schema"
            :key="index"
            :label="item.label"
            :label-class-name="getMainLabel(item.label)"
            class-name="pure-version"
            label-align="right"
          >
            <a
              :href="'https://www.npmjs.com/package/' + item.label"
              target="_blank"
            >
              <span
                :class="getMainLabel(item.label)"
                style="color: var(--el-color-primary)"
              >
                {{ item.field }}
              </span>
            </a>
          </el-descriptions-item>
        </el-descriptions>
      </el-scrollbar>
    </el-card>

    <el-card class="m-4 box-card" shadow="never">
      <template #header>
        <div class="card-header flex items-center">
          <span class="font-medium">开发环境依赖</span>
          <el-tag type="primary" effect="dark" size="small" round class="ml-1">
            {{ devSchema.length }}
          </el-tag>
        </div>
      </template>
      <el-scrollbar>
        <el-descriptions border size="small" :column="5">
          <el-descriptions-item
            v-for="(item, index) in devSchema"
            :key="index"
            :label="item.label"
            :label-class-name="getMainLabel(item.label)"
            class-name="pure-version"
            label-align="right"
          >
            <a
              :href="'https://www.npmjs.com/package/' + item.label"
              target="_blank"
            >
              <span
                :class="getMainLabel(item.label)"
                style="color: var(--el-color-primary)"
              >
                {{ item.field }}
              </span>
            </a>
          </el-descriptions-item>
        </el-descriptions>
      </el-scrollbar>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
:deep(.main-label) {
  font-size: 16px !important;
  color: var(--el-color-danger) !important;
}

:deep(.pure-version) {
  font-size: 14px !important;
  font-weight: 600 !important;
  opacity: 0.6;

  &:hover {
    opacity: 1;
  }
}

.main-content {
  margin: 0 !important;
}
</style>
