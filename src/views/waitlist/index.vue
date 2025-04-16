<script setup lang="ts">
import { ref } from "vue";
import { useColumns } from "./columns";

const tableRef = ref();
defineOptions({
  name: "waitlist"
});
// 从 useColumns 中获取表格相关配置和数据
const {
  loading,
  columns,
  dataList,
  pagination,
  loadingConfig,
  adaptiveConfig,
  onSizeChange,
  onCurrentChange
} = useColumns();

/**
 * processHtml：将 html 字符串拆分成若干部分，
 * 如果匹配到 <a> 标签，则：
 *  - 前面的文本部分（如果存在）先被加入到数组中，
 *    并将尾部如果存在类似 "1. "、"2. " 这样的数字序号去掉；
 *  - <a> 标签部分则转换为 type:"image"，包含链接地址和标签文字。
 * 剩下的尾部文本作为 type:"text" 加入。
 */
function processHtml(html: string): Array<{
  type: "text" | "image";
  content?: string;
  url?: string;
  label?: string;
}> {
  const parts = [];
  let lastIndex = 0;
  // 匹配 <a> 标签，支持单引号和双引号
  const regex = /<a[^>]*href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const index = match.index;
    let precedingText = html.substring(lastIndex, index);
    // 如果 precedingText 末尾存在数字序号（如 "1. "），去掉该部分
    precedingText = precedingText.replace(/\s*\d+\.\s*$/, "");
    if (precedingText) {
      parts.push({ type: "text", content: precedingText });
    }
    // match[2] 为链接地址，match[3] 为显示文本
    parts.push({ type: "image", url: match[2], label: match[3] });
    lastIndex = regex.lastIndex;
  }
  const trailingText = html.substring(lastIndex);
  if (trailingText) {
    parts.push({ type: "text", content: trailingText });
  }
  return parts;
}
</script>

<template>
  <el-card shadow="never">
    <pure-table
      ref="tableRef"
      stripe
      adaptive
      :adaptiveConfig="adaptiveConfig"
      row-key="id"
      alignWhole="center"
      showOverflowTooltip
      :loading="loading"
      :loading-config="loadingConfig"
      :data="dataList"
      :columns="columns"
      :pagination="pagination"
      @page-size-change="onSizeChange"
      @page-current-change="onCurrentChange"
      table-layout="auto"
    >
      <!-- 自定义 html 列插槽 -->
      <template #html="{ row }">
        <div class="html-container whitespace-nowrap">
          <template v-if="!row.html || row.html.trim() === ''">
            <span class="no-data">暂无数据</span>
          </template>
          <template v-else>
            <template v-for="(part, idx) in processHtml(row.html)" :key="idx">
              <!-- 文本部分直接输出 -->
              <template v-if="part.type === 'text'">
                <span v-html="part.content"></span>
              </template>
              <!-- 图片部分：显示 el-image 缩略图，后面跟显示链接文字 -->
              <template v-else-if="part.type === 'image'">
                <el-image
                  preview-teleported
                  loading="lazy"
                  :src="part.url"
                  :preview-src-list="[part.url]"
                  fit="cover"
                  class="w-[100px] h-[100px] inline-block align-middle mr-2"
                />
                <span class="image-label">{{ part.label }}</span>
              </template>
            </template>
          </template>
        </div>
      </template>
    </pure-table>
  </el-card>
</template>

<style scoped>
/* 图片标签文字样式 */
.image-label {
  font-size: 14px;
  vertical-align: middle;
}

/* 如果 html-container 内其他文本保持默认即可 */
.html-container {
  display: inline-block; /* 让 div 按内容宽度自适应 */
  min-width: max-content; /* 根据内容决定最小宽度 */
  /*  white-space: nowrap; 保持文本一行显示 */
}

/* 当 html 为空时显示的“暂无数据” */
.no-data {
  color: gray;
  font-style: italic;
}
</style>
