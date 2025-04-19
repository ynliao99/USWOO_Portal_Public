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
</template>

<script setup lang="ts">
import { ref, defineProps, defineExpose } from "vue";
import { nextTick } from "vue";

const props = defineProps({
  url: { type: String, required: true },
  title: { type: String, default: "弹窗标题" },
  width: { type: String, default: "90vw" },
  message: { type: String, default: "" },
  message_url: { type: String, default: "" }
});

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
}

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

.el-dialog {
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
