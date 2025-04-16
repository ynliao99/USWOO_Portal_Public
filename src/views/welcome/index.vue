<script setup lang="ts">
import { ref, markRaw, reactive } from "vue";
import ReCol from "@/components/ReCol";
import { useDark, randomGradient } from "./utils";
import WelcomeTable from "./components/table/index.vue";
import { ReNormalCountTo } from "@/components/ReCountTo";
import { useRenderFlicker } from "@/components/ReFlicker";

import { ChartBar, ChartLine, ChartRound } from "./components/charts";

import Segmented, { type OptionsType } from "@/components/ReSegmented";

import { getDashboardData } from "./WelcomeApiHandler";

const {
  progressData,
  chartData,
  monthlyPerformance,
  quarterlyPerformance,
  thirtyDaysPerformance,
  latestNewsData,
  coTableData
} = getDashboardData();

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
</script>

<template>
  <div>
    <el-row :gutter="24" justify="space-around">
      <re-col
        v-for="(item, index) in chartData"
        :key="index"
        v-motion
        class="mb-[18px]"
        :value="6"
        :md="12"
        :sm="12"
        :xs="24"
        :initial="{
          opacity: 0,
          y: 100
        }"
        :enter="{
          opacity: 1,
          y: 0,
          transition: {
            delay: 80 * (index + 1)
          }
        }"
      >
        <el-card class="line-card" shadow="never">
          <div class="flex justify-between">
            <span class="text-md font-medium">
              {{ item.name }}
            </span>
            <div
              class="w-8 h-8 flex justify-center items-center rounded-md"
              :style="{
                backgroundColor: isDark ? 'transparent' : item.bgColor
              }"
            >
              <IconifyIconOffline
                :icon="item.icon"
                :color="item.color"
                width="18"
                height="18"
              />
            </div>
          </div>
          <div class="flex justify-between items-start mt-3">
            <div class="w-1/2">
              <ReNormalCountTo
                :duration="item.duration"
                :fontSize="'1.6em'"
                :startVal="100"
                :endVal="item.value"
              />
              <p class="font-medium text-green-500">{{ item.percent }}</p>
            </div>
            <ChartLine
              v-if="item.data.length > 1"
              class="w-1/2!"
              :color="item.color"
              :data="item.data"
            />
            <ChartRound v-else :percent="item.data[0]" class="w-1/2" />
          </div>
        </el-card>
      </re-col>

      <re-col
        v-motion
        class="mb-[18px]"
        :value="18"
        :xs="24"
        :initial="{ opacity: 0, y: 100 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 400 } }"
      >
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
                <pure-table
                  :data="thirtyDaysPerformance"
                  :columns="columns"
                  stripe
                />
              </div>

              <!-- 本月排名 -->
              <div class="flex-1">
                <div class="text-base font-semibold">本月业绩排名</div>
                <pure-table
                  :data="monthlyPerformance"
                  :columns="columns"
                  stripe
                />
              </div>

              <!-- 本季度排名 -->
              <div class="flex-1">
                <div class="text-base font-semibold">本季度业绩排名</div>
                <pure-table
                  :data="quarterlyPerformance"
                  :columns="columns"
                  stripe
                />
              </div>
            </div>
          </el-scrollbar>
        </el-card>
      </re-col>
      <re-col
        v-motion
        class="mb-[18px]"
        :value="6"
        :xs="24"
        :initial="{
          opacity: 0,
          y: 100
        }"
        :enter="{
          opacity: 1,
          y: 0,
          transition: {
            delay: 480
          }
        }"
      >
        <el-card shadow="never" class="h-[552px]">
          <div class="flex justify-between">
            <span class="text-md font-medium">季度目标达成率</span>
          </div>
          <el-scrollbar
            max-height="490"
            style="overflow-x: hidden"
          >
            <div
              v-for="(item, index) in progressData"
              :key="index"
              :class="[
                'w-[99%]',
                'flex',
                'justify-between',
                'items-start',
                index === 0 ? 'mt-[2rem]' : 'mt-[2rem]'
              ]"
            >
              <span
                class="truncate-20 text-nowrap mr-2 text-text_color_regular text-sm"
              >
                {{ item.name }}
              </span>
              <el-progress
                :text-inside="true"
                :percentage="item.percentage"
                :stroke-width="21"
                :color="item.color"
                striped
                striped-flow
                :duration="item.duration"
              />
              <span
                class="truncate-4 text-nowrap ml-2 text-text_color_regular text-sm"
              >
                {{ item.target }}
              </span>
            </div>
          </el-scrollbar>
        </el-card>
      </re-col>

      <re-col
        v-motion
        class="mb-[18px]"
        :value="18"
        :xs="24"
        :initial="{
          opacity: 0,
          y: 100
        }"
        :enter="{
          opacity: 1,
          y: 0,
          transition: {
            delay: 560
          }
        }"
      >
        <el-card shadow="never" class="max-h-[1000px]">
          <div class="flex justify-between">
            <span class="text-md font-medium">转租、拼室友、短租需求</span>
          </div>
          <WelcomeTable
            v-if="Object.keys(coTableData).length > 0"
            :coTableData="coTableData"
            class="mt-3"
          />
          <!-- 可选：加载中显示 loading 状态 -->
          <el-skeleton v-else animated />
        </el-card>
      </re-col>

      <re-col
        v-motion
        class="mb-[18px]"
        :value="6"
        :xs="24"
        :initial="{
          opacity: 0,
          y: 100
        }"
        :enter="{
          opacity: 1,
          y: 0,
          transition: {
            delay: 480
          }
        }"
      >
        <el-card shadow="never" class="max-h-[1000px]">
          <div class="flex justify-between">
            <span class="text-md font-medium">我近期的看房</span>
          </div>
          <el-scrollbar max-height="924" class="mt-3">
            <el-timeline>
              <el-timeline-item
                v-for="(item, index) in latestNewsData"
                :key="index"
                center
                placement="top"
                :icon="
                  markRaw(
                    useRenderFlicker({
                      background: randomGradient({
                        randomizeHue: true
                      })
                    })
                  )
                "
                :timestamp="item.date"
              >
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
  display: inline-block; /* 让元素按照内容宽度显示 */
  width: 20ch; /* 限制最大宽度为10个字符 */
  overflow: hidden; /* 超出部分隐藏 */
  white-space: nowrap; /* 不允许换行 */
  text-overflow: ellipsis; /* 超出部分使用省略号表示 */
}
.truncate-4 {
  display: inline-block; /* 让元素按照内容宽度显示 */
  width: 4ch; /* 限制最大宽度为4个字符 */
  text-align: right;
}
</style>
<!--
  季度业绩
  未开单天数/上次开单
  本月视频上传
  本月高级公寓更新数量

  季度目标达成情况
  我的看房

  转租列表

  排行榜（本月、季度）

-->
