<template>
  <div class="iframe-dialog-container">
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
          :style="{
            height: props.message ? 'calc(90vh - 162px)' : 'calc(90vh - 125px)'
          }"
        />
      </div>

      <!-- 可选提示语 -->
      <div v-if="props.message" class="dialog-message">
        <div v-if="props.message_url">
          <a :href="props.message_url" target="_blank">{{ props.message }}</a>
        </div>
        <div v-else>{{ props.message }}</div>
      </div>
      <template #footer>
        <el-button @click="visible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineExpose, defineEmits, watch } from "vue";

// IframeDialog.vue
export interface IframeDialogProps {
  url: string;
  title?: string;
  width?: string;
  message?: string;
  message_url?: string;
}
const props = defineProps<IframeDialogProps>();

// 声明一个关闭时要 emit 的事件
const emit = defineEmits<{
  (e: "closed"): void;
}>();
const visible = ref(false);

function open() {
  visible.value = true;
}
function close() {
  visible.value = false;
}
function onOpen() {}
function onClose() {
  /* 关闭时逻辑 */
  emit("closed");
}
// 另外，监控 visible 也能触发 closed
watch(visible, v => {
  if (!v) emit("closed");
});

defineExpose({ open, close });
</script>

<style lang="scss">
/* 对话框容器强制设置 90% 高度 */
.iframe-dialog {
  /* 注意：Element Plus 会给 .el-dialog 加内联 width，这里用 custom-class + !important */
  width: 90vw !important;
  //height: 90vh !important;
  margin: 0 auto;

  /* 水平居中 */
}

/* iframe 占满整个 body 区域 */
.iframe-content {
  width: 100%;
  border: 0;
}

.iframe-dialog-container .el-dialog {
  width: 90vw;
  height: 90vh;
  max-height: 90vh !important;
  margin-top: 5vh;
  margin-bottom: 5vh;
}

/* 新增提示语样式 */
.dialog-message {
  padding-top: 16px;
  font-size: 14px;
  color: #606266;
  text-align: center;
}
</style>
