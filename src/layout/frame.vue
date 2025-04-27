<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { ref, unref, watch, onMounted, nextTick } from "vue";
import { getToken } from "@/utils/auth";

defineOptions({
  name: "LayFrame"
});

const props = defineProps<{
  frameInfo?: {
    frameSrc?: string;
    fullPath?: string;
  };
}>();

const { t } = useI18n();
const currentRoute = useRoute(); // <--- 确保 useRoute() 在使用 currentRoute 之前调用

// --- 修改在这里 ---
// 读取路由 meta 中的 frameLoading 标志来决定 loading 的初始值
// 如果 meta.frameLoading 明确设置为 false，则初始 loading 为 false，否则为 true
const loading = ref(currentRoute.meta?.frameLoading !== false);
// 解释：
// 1. currentRoute.meta?.frameLoading: 安全地访问 frameLoading，如果 meta 不存在或 frameLoading 不存在，结果是 undefined。
// 2. !== false: 只有当 frameLoading 的值 *明确* 是 false 时，这个表达式的结果才是 false。
//    - 如果 frameLoading 是 false,  false !== false -> false  => loading 初始为 false
//    - 如果 frameLoading 是 true,   true !== false -> true   => loading 初始为 true
//    - 如果 frameLoading 是 undefined, undefined !== false -> true => loading 初始为 true (保持默认行为)
// --- 修改结束 ---

const frameRef = ref<HTMLIFrameElement | null>(null);
const finalFrameSrc = ref<string>("");

// --- Logic to determine the final URL ---
const calculateFrameSrc = () => {
  // ... (calculateFrameSrc 函数保持不变) ...
  let src = "";
  const meta = unref(currentRoute.meta);

  if (
    props.frameInfo?.fullPath === currentRoute.fullPath &&
    props.frameInfo?.frameSrc
  ) {
    src = props.frameInfo.frameSrc;
  } else if (meta?.frameSrc) {
    src = meta.frameSrc as string;
    if (meta.useToken) {
      const tokenInfo = getToken();
      if (tokenInfo && tokenInfo.accessToken) {
        const separator = src.includes("?") ? "&" : "?";
        src += `${separator}token=${tokenInfo.accessToken}`;
        console.log("Token found and appended to iframe src.");
      } else {
        console.warn(
          "Frame marked with useToken=true, but no valid token found. Using base URL without token."
        );
      }
    }
  }

  if (!src) {
    console.error("Could not determine frame source URL.");
  }
  finalFrameSrc.value = src;
};

// --- Loading and Iframe Handling ---
function hideLoading() {
  // 只有在 loading 为 true 时才需要设置为 false
  if (loading.value) {
    loading.value = false;
  }
}

function initIframe() {
  // ... (initIframe 函数基本保持不变，但 hideLoading 调用现在是安全的) ...
  if (!finalFrameSrc.value) {
    hideLoading(); // 如果没 URL，也应该停止 loading
    return;
  }

  nextTick(() => {
    const iframe = unref(frameRef);
    if (!iframe) return;

    iframe.onload = null;
    iframe.onerror = null;
    let loaded = false;

    const handleLoad = () => {
      if (loaded) return;
      loaded = true;
      console.log("Iframe loaded successfully:", finalFrameSrc.value);
      hideLoading(); // 调用 hideLoading
      iframe.removeEventListener("load", handleLoad);
      iframe.removeEventListener("error", handleError);
    };

    const handleError = () => {
      if (loaded) return;
      loaded = true;
      console.error("Iframe failed to load:", finalFrameSrc.value);
      hideLoading(); // 调用 hideLoading
      iframe.removeEventListener("load", handleLoad);
      iframe.removeEventListener("error", handleError);
    };

    iframe.addEventListener("load", handleLoad);
    iframe.addEventListener("error", handleError);

    if (
      iframe.contentWindow &&
      iframe.contentWindow.document.readyState === "complete"
    ) {
      handleLoad();
    }
  });
}

// --- Watchers and Lifecycle ---
watch(
  () => currentRoute.fullPath,
  (newPath, oldPath) => {
    if (newPath !== oldPath) {
      // 只有在需要显示 loading 时才设置为 true (即 frameLoading !== false)
      if (currentRoute.meta?.frameLoading !== false) {
        loading.value = true;
      }
      calculateFrameSrc();
    }
  },
  { immediate: true }
);

onMounted(() => {
  // Initial calculation is done by the watcher above
  // Initial iframe setup is done by the watcher below
});

// Watch the calculated src. When it changes, re-initialize the iframe listeners.
watch(
  finalFrameSrc,
  (newSrc, oldSrc) => {
    if (newSrc !== oldSrc && newSrc) {
      // 只有在需要显示 loading 时才设置为 true
      if (currentRoute.meta?.frameLoading !== false) {
        loading.value = true;
      }
      initIframe();
    } else if (!newSrc) {
      hideLoading(); // 如果 URL 变为空，停止 loading
    }
  },
  { immediate: true }
); // Run on mount too
</script>

<template>
  <div
    v-loading="loading"
    class="frame"
    :element-loading-text="t('status.pureLoad')"
  >
    <iframe
      v-if="finalFrameSrc"
      ref="frameRef"
      :src="finalFrameSrc"
      class="frame-iframe"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
    />
    <div v-else class="frame-error">
      {{ t("status.frameSrcError") }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* styles remain the same */
.frame {
  position: absolute;
  inset: 0;

  .frame-iframe {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border: 0;
  }

  .frame-error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #f56c6c;
  }
}

.main-content {
  margin: 2px 0 0 !important;
}
</style>
