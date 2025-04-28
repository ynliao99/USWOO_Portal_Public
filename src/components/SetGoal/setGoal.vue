<template>
  <transition name="modal-fade">
    <div class="modal-backdrop fixed inset-0 overflow-y-auto h-full w-full flex items-center justify-center z-50"
      @click.self="handleCloseConditional">
      <div class="relative p-6 w-[90%] sm:w-[80%] md:w-96 shadow-xl rounded-lg bg-white">
        <div class="text-center">
          <h3 class="text-xl leading-6 font-semibold text-gray-900 mb-4">
            季度业绩目标
          </h3>
          <div class="px-5 py-4">
            <div v-if="isLoading" class="py-4  flex items-center justify-center">
              <p class="text-base text-gray-600">加载中...</p>
            </div>

            <div v-else-if="showSuccessAnimation" id="successGoal" class="w-full">
              <svg class="w-[40%] lg:w-1/3 xl:w-1/4 mx-auto mb-3" viewBox="0 0 400 400"
                preserveAspectRatio="xMidYMid meet">
                <circle fill="none" stroke="#68E534" stroke-width="20" cx="200" cy="200" r="190" class="circle"
                  :class="{ 'animate-circle': animateSvg }" stroke-linecap="round" transform="rotate(-90 200 200)" />
                <polyline fill="none" stroke="#68E534" stroke-width="24" points="88,214 173,284 304,138"
                  stroke-linecap="round" stroke-linejoin="round" class="tick" :class="{ 'animate-tick': animateSvg }" />
              </svg>
              <p class="goalText text-lg" :class="{ 'animate-title': animateSvg }"> 目标已设置: ${{
                goalValue?.toLocaleString() ?? "N/A" }}
              </p>
            </div>

            <div v-else-if="!isGoalSet && !apiErrorOccurred">
              <p id="goalWarningText" class="text-base text-gray-600 mb-6" v-html="warningText"></p>
              <input id="s2goal" ref="goalInputRef" type="text" insectes inputmode="numeric" :value="displayValue"
                label="s2goal" class="w-full p-2 text-center mt-4" placeholder="输入目标值 (数字)" :disabled="isLoading"
                @input="handleRealtimeInput" @keydown="preventInvalidKeys"
                @keyup.enter="handleSetClick" />
            </div>

            <div v-else-if="isGoalSet && !apiErrorOccurred" class="flex flex-col justify-center">
              <p class="text-base text-gray-700 mb-3"> 您已设置 {{ currentSeason }} 目标：
              </p>
              <p class="text-3xl font-bold text-rose-400 mb-3"> ${{ goalValue?.toLocaleString() ?? "N/A" }}
              </p>
              <p class="text-sm text-gray-500">(目标设置后不可修改)</p>
            </div>

            <div v-else-if="apiErrorOccurred" class="flex flex-col justify-center items-center text-red-600">
              <Icon icon="mdi:alert-circle-outline" class="text-3xl mb-2" />
              <p class="text-base font-medium mb-1">无法加载目标信息</p>
              <p class="text-sm text-gray-500">{{ errorMessage }}</p>
            </div>

            <p v-if="errorMessage && !apiErrorOccurred" class="mt-4 text-sm text-red-500">
              {{ errorMessage }}
            </p>
          </div>

          <div class="items-center px-4 pt-4 pb-2 border-t border-gray-100">
            <el-button v-if="!isGoalSet && !showSuccessAnimation && !apiErrorOccurred" id="setBtn" type="primary"
              size="large" round :loading="isLoading && !showSuccessAnimation"
              :disabled="inputValue === null || inputValue < 0" @click="handleSetClick">
              {{ (isLoading && !showSuccessAnimation) ? '处理中...' : '确认设置' }}
            </el-button>

            <el-button v-if="isGoalSet" id="closeModalBtn" type="default" size="large" round
              :class="{ 'ml-3': !(!isGoalSet && !apiErrorOccurred) }" :disabled="isLoading"
              @click="handleClose('closed')">
              关闭
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
// Script 部分保持不变...
import {
  ref,
  onMounted,
  nextTick,
  computed,
  defineProps,
  watch,
} from "vue";
import { http } from "@/utils/http"; // Ensure path is correct
import { ElButton } from 'element-plus'; 
import { Icon } from '@iconify/vue';
// --- Define Props ---
const props = defineProps<{
  onClose: (payload?: {
    status: "success" | "error" | "closed";
    goal?: number;
    message?: string;
  }) => void;
  // onTransitionComplete: () => void;
}>();
const handleCloseConditional = () => {
  // 只有当目标已设置时，才允许通过点击背景关闭
  if (isGoalSet.value) {
    handleClose('closed');
  } else {
    console.log('Backdrop click ignored: Goal not set yet.');
    // 可选: 这里可以加一个轻微的震动效果或提示，提醒用户不能关闭
  }
}
// --- Reactive State ---
const isLoading = ref(true);
const isGoalSet = ref(false);
const goalValue = ref<number | null>(null);
const currentSeason = ref<string>("");
const inputValue = ref<number | null>(null); // Stores the RAW number
const displayValue = ref<string>("");      // Stores the FORMATTED string for display

const errorMessage = ref<string | null>(null);
const showSuccessAnimation = ref(false);
const animateSvg = ref(false);
const apiErrorOccurred = ref(false);

// --- Refs ---
const goalInputRef = ref<HTMLInputElement | null>(null);

// --- API Config ---
const apiUrl = "/portalapi/checkGoal/"; // 确保末尾斜杠是否需要

// --- Computed ---
const warningText = computed(() => {
  const seasonText = currentSeason.value ? `${currentSeason.value}` : "本季度";
  // 使用更自然的换行，而不是 <br>
  return `您尚未设置 ${seasonText} 业绩目标。\n请先设置，设置后不可修改！`;
});

// --- Formatting Helpers ---
const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return ""; // Return empty string if no valid number
  }
  // Format with commas and prepend '$', remove fractional digits for integers
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const unformatCurrency = (value: string): number | null => {
  if (!value) return null;
  // Remove '$' and ',' characters
  const numericString = value.replace(/[$,]/g, '');
  // Parse to number, handle potential empty string or invalid chars remaining
  const num = parseInt(numericString, 10);
  return isNaN(num) ? null : num;
};

// --- Functions ---

const handleRealtimeInput = (event: Event) => {
  const inputElement = event.target as HTMLInputElement;
  const originalValue = inputElement.value;
  const originalCursorPos = inputElement.selectionStart ?? 0;

  // --- Cursor Position Calculation ---
  // Store how many digits were before the cursor in the *original* value
  let originalDigitsBeforeCursor = 0;
  for (let i = 0; i < originalCursorPos; i++) {
    if (/\d/.test(originalValue[i])) {
      originalDigitsBeforeCursor++;
    }
  }

  // 1. Get raw number value by stripping all non-digits
  const rawValueString = originalValue.replace(/[^0-9]/g, '');
  const currentNumericValue = rawValueString === '' ? null : parseInt(rawValueString, 10);

  // Update the underlying numeric model (important for v-if/disabled states etc.)
  inputValue.value = currentNumericValue;

  // 2. Format the raw number
  const formattedValue = formatCurrency(currentNumericValue); // e.g., "$1,234" or "$0" or ""

  // Update the reactive variable that the input's :value is bound to
  displayValue.value = formattedValue;

  // 3. Calculate the new cursor position in the *formatted* string
  nextTick(() => {
    let newCursorPos = 0;
    let digitsCounted = 0;
    for (let i = 0; i < formattedValue.length; i++) {
      if (/\d/.test(formattedValue[i])) {
        digitsCounted++;
      }
      if (digitsCounted === originalDigitsBeforeCursor) {
        newCursorPos = i + 1; // Place cursor *after* the corresponding digit
        break;
      }
    }
    // If no digits were present originally (or all deleted), cursor goes to start
    // If cursor was originally at the start (before any digits), it should be after '$' if present
    if (originalDigitsBeforeCursor === 0 && rawValueString !== '') {
      newCursorPos = 1; // After '$'
    } else if (rawValueString === '') {
      newCursorPos = 0; // Start of empty input
    }
    // Edge case: If the loop finishes without finding enough digits (e.g., formatting removed them?)
    // place cursor at the end. This might happen if formatting logic changes.
    if (newCursorPos === 0 && originalDigitsBeforeCursor > 0 && formattedValue.length > 0) {
      newCursorPos = formattedValue.length;
    }


    // Force update the input element's value (sometimes needed with nextTick)
    inputElement.value = formattedValue;
    // Set the calculated cursor position
    inputElement.setSelectionRange(newCursorPos, newCursorPos);
  });

  errorMessage.value = null; // Clear error on input
};


const checkGoalStatus = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  apiErrorOccurred.value = false;
  isGoalSet.value = false;
  goalValue.value = null;
  currentSeason.value = "";

  try {
    // 假设 http.request 返回的数据结构是 { status: 'success'|'error', data: {...}, message?: '...' }
    // 或者直接就是后端返回的 JSON 对象，需要根据你的 http 工具调整
    const response = await http.request<any>("get", apiUrl);

    // *** 重要: 请根据你的 http 工具实际返回的结构调整以下判断 ***
    // 假设后端直接返回 { status: '...', currentSeason: '...', ... }
    const data = response; // 如果 http.request 直接返回 data

    if (data.status === "success") {
      isGoalSet.value = data.isGoalSet;
      currentSeason.value = data.currentSeason;
      if (data.isGoalSet && data.goal !== undefined) {
        goalValue.value = data.goal;
      }
      if (!isGoalSet.value) {
        await nextTick();
        goalInputRef.value?.focus();
      }
    } else {
      errorMessage.value = data.message || "无法获取目标状态。";
      apiErrorOccurred.value = true;
    }
  } catch (error: any) {
    console.error("Error checking goal status:", error);
    errorMessage.value = `检查目标状态时出错: ${error.message || "请稍后重试"}`;
    apiErrorOccurred.value = true;
  } finally {
    isLoading.value = false;
  }
};

const setGoal = async (goal: number) => {
  isLoading.value = true; // 设置 loading true
  errorMessage.value = null;
  showSuccessAnimation.value = false;
  animateSvg.value = false;

  try {
    const response = await http.request<any>("post", apiUrl, {
      data: { action: "setGoal", goal: goal }
    });
    const data = response; // 假设 http 工具直接返回 data

    if (data.status === "success") {
      // 更新状态
      isGoalSet.value = true;
      goalValue.value = data.goal ?? goal;

      // ***** 修复点：在这里将 isLoading 设置为 false *****
      isLoading.value = false;

      // 现在 isLoading 为 false，可以触发依赖 !isLoading 的成功动画视图
      triggerSuccessAnimation();

      // 成功动画播放一会后自动关闭
      // setTimeout(() => {
      //   handleClose("success", { goal: goalValue.value });
      // }, 2000); // 延迟时间可调整

    } else {
      // API 返回错误状态
      errorMessage.value = data.message || "设置目标失败，请重试。";
      isLoading.value = false; // 错误时也要设置为 false
    }
  } catch (error: any) {
    // 网络或JS错误
    console.error("Error setting goal:", error);
    errorMessage.value = `设置目标时出错: ${error.message || "请稍后重试"}`;
    isLoading.value = false; // 异常时也要设置为 false
  }
  // 注意：现在所有路径都会设置 isLoading = false，所以不需要 finally 块了
};
const triggerSuccessAnimation = () => {
  showSuccessAnimation.value = true;
  nextTick(() => {
    animateSvg.value = true;
  });
};

const handleSetClick = () => {
  if (inputValue.value === null || inputValue.value < 10000) {
    errorMessage.value = "请输入一个有效的目标值 (大于等于10,000)。";
    goalInputRef.value?.focus();
    return;
  }
  if (!isLoading.value) {
    setGoal(inputValue.value);
  }
};

const preventInvalidKeys = (event: KeyboardEvent) => {
  if ([46, 8, 9, 27, 13, 110, 190].includes(event.keyCode) ||
    (event.keyCode == 65 && (event.ctrlKey === true || event.metaKey === true)) ||
    (event.keyCode == 67 && (event.ctrlKey === true || event.metaKey === true)) ||
    (event.keyCode == 86 && (event.ctrlKey === true || event.metaKey === true)) ||
    (event.keyCode == 88 && (event.ctrlKey === true || event.metaKey === true)) ||
    (event.keyCode >= 35 && event.keyCode <= 40)) { return; }
  if (['e', 'E', '+', '-'].includes(event.key) || [69, 187, 189].includes(event.keyCode)) { event.preventDefault(); }
};

const handleClose = (status: "success" | "error" | "closed", data?: any) => {

  // if (isLoading.value && !showSuccessAnimation.value && status !== "success") return;
  props.onClose({ status, ...data });
};

// --- Lifecycle Hook ---
onMounted(() => { checkGoalStatus(); });

// --- Watcher to update displayValue if inputValue changes programmatically ---
// (This might be redundant given the focus/blur logic, but can be a safeguard)
watch(inputValue, (newValue) => {
  
     displayValue.value = formatCurrency(newValue);
  
});

</script>

<style scoped>
/* 新增：定义遮罩背景样式 */
.modal-backdrop {
  background-color: rgba(0, 0, 0, 0.7);
  /* 黑色，50% 透明度 */
}

/* 过渡动画样式 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.52, 0.02, 0.19, 1.02);
  /* 平滑过渡 */
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* 内容区域的弹出效果 */
.modal-fade-enter-active .relative,
.modal-fade-leave-active .relative {
  transition: all 0.3s cubic-bezier(0.52, 0.02, 0.19, 1.02) 0.1s;
  /* 延迟一点开始 */
  transform: scale(1);
  /* 确保 transform 也参与过渡 */
}

.modal-fade-enter-from .relative,
.modal-fade-leave-to .relative {
  transform: scale(0.9);
  /* 从稍小尺寸开始 */
  opacity: 0;
}


/* 输入框样式 */
#s2goal::-webkit-inner-spin-button,
#s2goal::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

#s2goal[type="number"] {
  appearance: textfield;
  -moz-appearance: textfield;
}

#s2goal {
  font-size: 2.5em;
  font-weight: 600;
  color: #f95865;
  caret-color: #f95865;
  border: none;
  border-bottom: 2px solid #e5e7eb;
  outline: none;
  background-color: transparent;
  transition: border-color 0.3s ease;
  padding-bottom: 4px;
  /* Ensure text-align is center if needed */
  text-align: center;
}

#s2goal:focus {
  border-bottom-color: #f95865;
}

#s2goal::placeholder {
  font-size: 0.5em;
  color: #9ca3af;
  vertical-align: middle;
  font-weight: 400;
}

/* Hide spinner buttons (might not be necessary for type="text", but good practice) */
#s2goal::-webkit-inner-spin-button,
#s2goal::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

#s2goal[type="number"] {
  /* Keep this rule for safety if type somehow reverts */
  appearance: textfield;
  -moz-appearance: textfield;
}
/* 成功动画样式 */
.goalText {
  font-family: Helvetica, Arial, sans-serif;
  /* font-size: 24px; */
  /* 已在 template 中调整 */
  margin-top: 10px;
  color: #333;
  opacity: 0;
}

.circle {
  stroke-dasharray: 1194;
  stroke-dashoffset: 1194;
}

.tick {
  stroke-dasharray: 350;
  stroke-dashoffset: 350;
}

@keyframes circle-animation {
  from {
    stroke-dashoffset: 1194;
  }

  to {
    stroke-dashoffset: 0;
  }
}

@keyframes tick-animation {
  from {
    stroke-dashoffset: 350;
  }

  to {
    stroke-dashoffset: 0;
  }
}

@keyframes title-animation {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
@keyframes shake {

  10%,
  90% {
    transform: translateX(-1px);
  }

  20%,
  80% {
    transform: translateX(2px);
  }

  30%,
  50%,
  70% {
    transform: translateX(-3px);
  }

  40%,
  60% {
    transform: translateX(3px);
  }
}

.shake {
  animation: shake 0.4s cubic-bezier(.36, .07, .19, .97) both;
}
.animate-circle {
  animation: circle-animation 0.8s ease-out forwards;
}

.animate-tick {
  animation: tick-animation 0.6s 0.3s ease-out forwards;
}

.animate-title {
  animation: title-animation 0.5s 0.5s ease-out forwards;
}

#successGoal svg {
  max-width: 100%;
  height: auto;
}

/* 针对 warningText 中的换行 */
#goalWarningText {
  white-space: pre-line;
  /* 保留换行符 */
}

/* 可以移除 .input-underline-only 如果不再单独使用 */
</style>