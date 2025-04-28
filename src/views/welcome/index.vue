<script setup lang="ts">
import { ref, markRaw, reactive, onMounted, computed } from "vue";
import ReCol from "@/components/ReCol";
import { useDark, randomGradient } from "./utils";
import WelcomeTable from "./components/table/index.vue";
import { ReNormalCountTo } from "@/components/ReCountTo";
import { useRenderFlicker } from "@/components/ReFlicker";

import { ChartLine, ChartRound } from "./components/charts";

import { getDashboardData } from "./WelcomeApiHandler";
import { openGoalModal, checkGoalSetStatus, type GoalModalResult, type GoalStatusResult } from '@/components/SetGoal/';
import { message } from "@/utils/message";
import { Icon } from '@iconify/vue';

const {
  progressData,
  monthlyPerformance,
  quarterlyPerformance,
  thirtyDaysPerformance,
  latestNewsData,
  coTableData
} = getDashboardData();

const dashboardData = reactive(getDashboardData());

defineOptions({
  name: "Welcome"
});

const { isDark } = useDark();

const columns: TableColumnList = [
  {
    label: "姓名",
    prop: "name"
  },
  {
    label: "业绩金额",
    prop: "amount"
  }
];

// --- Computed properties to split chartData ---
const firstChartItem = computed(() => dashboardData.chartData?.[0] ?? null);
const remainingChartData = computed(() => dashboardData.chartData?.slice(1) ?? []);

// --- State for Goal Setting ---
const isGoalInitiallySet = ref<boolean | null>(null); // null: unchecked, true: set, false: not set
const isLoadingGoalStatus = ref<boolean>(true);
const goalCheckError = ref<string | null>(null);
const currentSeasonName = ref<string>(''); // Store the season name

// --- Function to handle setting the goal ---
const handleSetGoalClick = async () => {
  console.log("Opening goal modal...");
  try {
    // 打开弹窗并等待它关闭 (无论怎么关闭的)
    const result: GoalModalResult = await openGoalModal();

    message(`正在刷新目标状态...`, { type: "info", duration: 1000 }); // 给用户一个提示

    // 添加一个短暂延时，增加数据库同步的可能性 (可选，但推荐)
    await new Promise(res => setTimeout(res, 500)); // 等待 500ms

    // **** 核心：直接调用检查状态的函数 ****
    await checkInitialGoalStatus();
    console.log(">>> Re-check complete. isGoalInitiallySet value:", isGoalInitiallySet.value);

    // 可以根据 *重新检查后* 的状态给提示
    if (isGoalInitiallySet.value === true && result?.goal) { // 如果 modal 返回了 goal 值 (虽然现在不会了)
      message(`季度目标已成功设置为: ${result.goal.toLocaleString()}`, { type: "success" });

    } else if (isGoalInitiallySet.value === true) {
      message(`目标状态已更新`, { type: "success" });
    } else {
      message(`目标状态已刷新，但似乎仍未设置`, { type: "warning" });
    }


  } catch (error) { // 这个 catch 主要捕获 openGoalModal 或 checkInitialGoalStatus 本身的错误
    console.error("Error opening or handling the goal modal:", error);
    message(`处理目标设置操作时出错。`, { type: "error" });
    // 出错后也可以考虑刷新一下状态
    await checkInitialGoalStatus();
  }
};

// --- Function to check initial goal status ---
const checkInitialGoalStatus = async () => {
  isLoadingGoalStatus.value = true;
  goalCheckError.value = null;
  isGoalInitiallySet.value = null;
  currentSeasonName.value = '';
  console.log("Checking initial goal status...");
  try {
    const statusResult: GoalStatusResult = await checkGoalSetStatus();
    isGoalInitiallySet.value = statusResult.isGoalSet;
    currentSeasonName.value = statusResult.season ?? '本季度';
    console.log("Goal status checked:", statusResult);
  } catch (error: any) {
    console.error("Failed to check initial goal status:", error);
    goalCheckError.value = error.message || "检查季度目标状态失败。";
    isGoalInitiallySet.value = false; // Treat error as 'not set' for UI flow
  } finally {
    isLoadingGoalStatus.value = false;
  }
};

// --- Lifecycle Hook ---
onMounted(() => {
  checkInitialGoalStatus();
});

</script>

<template>
  <div>
    <el-row :gutter="24" justify="space-around">
      <!-- == Card 1: Conditional Goal Status / First Chart Item == -->
      <re-col v-motion class="mb-[18px]" :value="6" :md="12" :sm="12" :xs="24" :initial="{ opacity: 0, y: 100 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 80 } }">
        <el-card class="line-card h-[155px]" shadow="never"
          :class="{ 'cursor-pointer goal-set-card': isGoalInitiallySet === true && !isLoadingGoalStatus && !goalCheckError }"
          @click="isGoalInitiallySet === true && !isLoadingGoalStatus && !goalCheckError ? handleSetGoalClick() : null">
          <!-- Loading State -->
          <div v-if="isLoadingGoalStatus" class="flex items-center justify-center h-full">
            <el-skeleton :rows="3" animated />
          </div>

          <!-- Error State -->
          <div v-else-if="goalCheckError" class="flex flex-col items-center justify-center h-full text-center px-2">
            <Icon icon="mdi:alert-circle-outline" color="red" width="30" height="30" />
            <p class="mt-1 text-xs text-red-600">加载目标状态失败</p>
            <el-button class="mt-2" size="small" link @click="checkInitialGoalStatus">重试</el-button>
          </div>

          <!-- Goal IS Set State (Now inside clickable card) -->
          <template v-else-if="isGoalInitiallySet === true && firstChartItem">
            <div class="flex justify-between">
              <span class="text-md font-medium">
                {{ firstChartItem.name }}
              </span>
              <div class="w-8 h-8 flex justify-center items-center rounded-md"
                :style="{ backgroundColor: isDark ? 'transparent' : firstChartItem.bgColor }">
                <Icon icon="ic:outline-attach-money" :color="firstChartItem.color" width="18" height="18" />
              </div>
            </div>
            <div class="flex justify-between items-start mt-3">
              <div class="w-1/2">
                <ReNormalCountTo :duration="firstChartItem.duration" :fontSize="'1.6em'" :startVal="100"
                  :endVal="firstChartItem.value" />
                <p class="font-medium text-green-500">{{ firstChartItem.percent }}</p>
              </div>
              <ChartLine v-if="firstChartItem.data.length > 1" class="w-1/2!" :color="firstChartItem.color"
                :data="firstChartItem.data" />
              <ChartRound v-else :percent="firstChartItem.data[0]" class="w-1/2" />
            </div>
          </template>
          <!-- Fallback if goal is set but firstChartItem is somehow null -->
          <div v-else-if="isGoalInitiallySet === true && !firstChartItem"
            class="flex items-center justify-center h-full text-gray-400">
            (数据加载中...)
          </div>

          <!-- Goal IS NOT Set State (Not clickable) -->
          <div v-else-if="isGoalInitiallySet === false" v-motion
            class="flex flex-col items-center justify-center h-full text-center px-2 goal-prompt-card"
            :initial="{ opacity: 0, scale: 0.9 }"
            :enter="{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20, delay: 100 } }">
            <p class="text-sm font-medium text-gray-600 mb-2">请设置{{ currentSeasonName }}目标</p>
            <p class="text-xs text-gray-400 mb-3">设置后可追踪进度</p>
            <el-button type="primary" round size="small" class="set-goal-button animate-pulse-strong"
              @click="handleSetGoalClick">
              >
              <Icon icon="mdi:plus-circle-outline" class="mr-1" />
              立即设置
            </el-button>
          </div>

        </el-card>
      </re-col>

      <re-col v-for="(item, index) in remainingChartData" :key="'chart-' + index" v-motion class="mb-[18px]" :value="6"
        :md="12" :sm="12" :xs="24" :initial="{ opacity: 0, y: 100 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 80 * (index + 2) } }">
        <el-card class="line-card h-[155px]" shadow="never">
          <div class="flex justify-between">
            <span class="text-md font-medium">
              {{ item.name }}
            </span>
            <div class="w-8 h-8 flex justify-center items-center rounded-md"
              :style="{ backgroundColor: isDark ? 'transparent' : item.bgColor }">
              <IconifyIconOffline :icon="item.icon" :color="item.color" width="18" height="18" />
            </div>
          </div>
          <div class="flex justify-between items-start mt-3">
            <div class="w-1/2">
              <ReNormalCountTo :duration="item.duration" :fontSize="'1.6em'" :startVal="100" :endVal="item.value" />
              <p class="font-medium text-green-500">{{ item.percent }}</p>
            </div>
            <ChartLine v-if="item.data.length > 1" class="w-1/2!" :color="item.color" :data="item.data" />
            <ChartRound v-else :percent="item.data[0]" class="w-1/2" />
          </div>
        </el-card>
      </re-col>

      <re-col v-motion class="mb-[18px]" :value="18" :xs="24" :initial="{ opacity: 0, y: 100 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 400 } }">
        <el-card class="bar-card h-[552px]" shadow="never">
          <div class="flex justify-between mb-2">
            <span class="text-md font-medium">业绩排名</span>
          </div>
          <!-- 添加一个滚动容器 -->
          <el-scrollbar max-height="490">
            <div class="flex flex-col lg:flex-row gap-4">
              <!-- 近30天排名 -->
              <div class="flex-1">
                <div class="text-base font-semibold">近30天业绩排名</div>
                <pure-table :data="thirtyDaysPerformance" :columns="columns" stripe />
              </div>

              <!-- 本月排名 -->
              <div class="flex-1">
                <div class="text-base font-semibold">本月业绩排名</div>
                <pure-table :data="monthlyPerformance" :columns="columns" stripe />
              </div>

              <!-- 本季度排名 -->
              <div class="flex-1">
                <div class="text-base font-semibold">本季度业绩排名</div>
                <pure-table :data="quarterlyPerformance" :columns="columns" stripe />
              </div>
            </div>
          </el-scrollbar>
        </el-card>
      </re-col>

      <re-col v-motion class="mb-[18px]" :value="6" :xs="24" :initial="{
        opacity: 0,
        y: 100
      }" :enter="{
        opacity: 1,
        y: 0,
        transition: {
          delay: 480
        }
      }">
        <el-card shadow="never" class="h-[552px]">
          <div class="flex justify-between">
            <span class="text-md font-medium">季度目标达成率</span>
          </div>
          <el-scrollbar max-height="490" style="overflow-x: hidden">
            <div v-for="(item, index) in progressData" :key="index" :class="[
              'w-[99%]',
              'flex',
              'justify-between',
              'items-start',
              index === 0 ? 'mt-[2rem]' : 'mt-[2rem]'
            ]">
              <span class="truncate-20 text-nowrap mr-2 text-text_color_regular text-sm">
                {{ item.name }}
              </span>
              <el-progress :text-inside="true" :percentage="item.percentage" :stroke-width="21" :color="item.color"
                striped striped-flow :duration="item.duration" />
              <span class="truncate-4 text-nowrap ml-2 text-text_color_regular text-sm">
                {{ item.target }}
              </span>
            </div>
          </el-scrollbar>
        </el-card>
      </re-col>

      <re-col v-motion class="mb-[18px]" :value="18" :xs="24" :initial="{
        opacity: 0,
        y: 100
      }" :enter="{
        opacity: 1,
        y: 0,
        transition: {
          delay: 560
        }
      }">
        <el-card shadow="never" class="max-h-[1000px]">
          <div class="flex justify-between">
            <span class="text-md font-medium">转租、拼室友、短租需求</span>
          </div>
          <WelcomeTable v-if="Object.keys(coTableData).length > 0" :coTableData="coTableData" class="mt-3" />
          <!-- 可选：加载中显示 loading 状态 -->
          <el-skeleton v-else animated />
        </el-card>
      </re-col>

      <re-col v-motion class="mb-[18px]" :value="6" :xs="24" :initial="{
        opacity: 0,
        y: 100
      }" :enter="{
        opacity: 1,
        y: 0,
        transition: {
          delay: 480
        }
      }">
        <el-card shadow="never" class="max-h-[1000px]">
          <div class="flex justify-between">
            <span class="text-md font-medium">我近期的看房</span>
          </div>
          <el-scrollbar max-height="924" class="mt-3">
            <el-timeline>
              <el-timeline-item v-for="(item, index) in latestNewsData" :key="index" center placement="top" :icon="markRaw(
                useRenderFlicker({
                  background: randomGradient({
                    randomizeHue: true
                  })
                })
              )
                " :timestamp="item.date">
                <p class="text-text_color_regular text-sm">
                  {{ item.message }}
                </p>
              </el-timeline-item>
            </el-timeline>
          </el-scrollbar>
        </el-card>
      </re-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-card) {
  --el-card-border-color: none;

  /* 解决进度条宽度 */
  .el-progress--line {
    width: 85%;
  }

  /* 解决进度条字体大小 */
  .el-progress-bar__innerText {
    font-size: 15px;
  }

  /* 隐藏 el-scrollbar 滚动条 */
  .el-scrollbar__bar {
    display: none;
  }

  /* el-timeline 每一项上下、左右边距 */
  .el-timeline-item {
    margin: 0 6px;
  }
}

.main-content {
  margin: 20px 20px 0 !important;
}

.progress-container {
  max-width: 100%;
  overflow-x: hidden;
}

.truncate-20 {
  display: inline-block;
  /* 让元素按照内容宽度显示 */
  width: 20ch;
  /* 限制最大宽度为10个字符 */
  overflow: hidden;
  /* 超出部分隐藏 */
  white-space: nowrap;
  /* 不允许换行 */
  text-overflow: ellipsis;
  /* 超出部分使用省略号表示 */
}

.truncate-4 {
  display: inline-block;
  /* 让元素按照内容宽度显示 */
  width: 4ch;
  /* 限制最大宽度为4个字符 */
  text-align: right;
}

/* Animation for the Set Goal button */
@keyframes pulse-strong {

  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.05);
    opacity: 0.95;
  }

  /* Slightly subtler pulse */
}

.animate-pulse-strong {
  animation: pulse-strong 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.line-card {
  /* Ensure consistent height for the top row cards */
  height: 155px;
  display: flex;
  /* Use flexbox for vertical centering of content */
  flex-direction: column;
  justify-content: center;
  /* Center content vertically */
}



@keyframes pulse-strong {
  /* ... */
}



.line-card {
  height: 155px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  // Add transition for hover/active effects
  transition: all 0.2s ease-out;
}

/* Add styles for the clickable card state */
.goal-set-card {
  &:hover {
    transform: translateY(-3px); // Slight lift effect
    box-shadow: var(--el-box-shadow-light); // Use Element Plus shadow variable
  }

  &:active {
    transform: translateY(-1px) scale(0.99); // Slight press effect
    box-shadow: var(--el-box-shadow); // Slightly deeper shadow on press
  }
}

// Prevent hover/active effects on non-clickable areas if needed
.goal-prompt-card .el-button:hover {
  // Override card hover if button itself has hover
  transform: none;
}


:deep(.el-card) {
  --el-card-border-color: none;
  /* Adjust if the card content shouldn't be centered anymore */
  /* justify-content: initial; */
  /* If content shouldn't be centered when chart shows */

  .el-scrollbar__bar {
    display: none;
  }

  .el-timeline-item {
    margin: 0 6px;
  }
}
</style>
