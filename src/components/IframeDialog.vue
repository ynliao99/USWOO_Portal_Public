<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="width"
    center
    class="iframe-dialog"
    @open="onOpen"
    @close="onClose"
  >
    <div class="dialog-content">
      <iframe
        v-if="visible"
        :src="url"
        frameborder="0"
        class="iframe-content"
      />
    </div>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, defineProps, defineExpose } from "vue";

const props = defineProps({
  url: { type: String, required: true },
  title: { type: String, default: "弹窗标题" },
  width: { type: String, default: "90vw" }
});

const visible = ref(false);

function open() {
  visible.value = true;
}
function close() {
  visible.value = false;
}
function onOpen() {
  /* 打开时逻辑 */
}
function onClose() {
  /* 关闭时逻辑 */
}

defineExpose({ open, close });
</script>

<style lang="scss">
/* 对话框容器强制设置 90% 高度 */
.iframe-dialog {
  /* 注意：Element Plus 会给 .el-dialog 加内联 width，这里用 custom-class + !important */
  width: 90vw !important;
  height: 90vh !important;
  margin: 0 auto;

  /* 水平居中 */
}

/* 去掉 dialog-body 的默认 padding，并撑满剩余高度 */
.iframe-dialog .el-dialog__body {
  /* calc(总高 90vh - header 高度 - footer 高度) 
     header ~ 56px, footer ~ 56px（可根据实际样式微调） */
  height: calc(90vh - 125px);
  padding: 0;
  overflow: hidden;
}

/* iframe 占满整个 body 区域 */
.iframe-content {
  width: 100%;
  height: calc(90vh - 125px);
  border: 0;
}

.el-dialog {
  width: 90vw;
  height: 90vh;
  max-height: 90vh !important;
  margin-top: 5vh;
  margin-bottom: 5vh;
}
</style>
