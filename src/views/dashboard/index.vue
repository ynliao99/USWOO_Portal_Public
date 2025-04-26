<template>
  <div class="app-container">
    <div v-if="loading" id="loading-overlay">
      <div class="loader"><i class="fas fa-sync" /></div>
      <p class="loadingText">&nbsp; 正在更新数据……</p>
    </div>

    <div v-else class="dashboard">
      <div class="left-panel">
        <div class="upper-left">
          <div class="title">{{ rankingTitle }}</div>
          <table class="performance-table">
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th>姓名</th>
                <th style="width: 20%">业绩</th>
                <th style="width: 10%">单数</th>
                <th style="width: 10%">看房</th>
                <th style="width: 10%">视频</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in performanceData.slice(0, 5)"
                :key="item.userAgentName || index"
              >
                <td>{{ index + 1 }}</td>
                <td>{{ item.userAgentName || "N/A" }}</td>
                <td>
                  {{
                    formatNumberWithCommas(item.rentAmountPendingClose) || "N/A"
                  }}
                </td>
                <td>{{ item.rentDealsPendingClose || "N/A" }}</td>
                <td>{{ item.showingCount || "N/A" }}</td>
                <td>
                  {{ item.videoCount !== undefined ? item.videoCount : "N/A" }}
                </td>
              </tr>
              <template v-if="performanceData.slice(0, 5).length < 5">
                <tr
                  v-for="n in 5 - performanceData.slice(0, 5).length"
                  :key="'placeholder-' + n"
                >
                  <td>&nbsp;</td>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div class="lower-left">
          <div class="left-section">
            <div class="section-title">业绩<br />中位数</div>
            <div class="section-number">
              {{ formatNumberWithCommas(summary.medianRentAmountPendingClose) }}
            </div>
          </div>
          <div class="middle-section">
            <div class="section-title">订单<br />总数</div>
            <div class="section-number">
              {{ summary.totalRentDealsPendingClose }}
            </div>
          </div>
          <div class="right-section">
            <div class="section-title">订单<br />均值</div>
            <div class="section-number">
              {{ formatNumberWithCommas(summary.averageRentPerDeal) }}
            </div>
          </div>
          <div class="xhs-section">
            <div class="section-title">美国市场<br />单均值</div>
            <div class="section-number">
              {{ formatNumberWithCommas(summary.averageUSMarket) }}
            </div>
          </div>
        </div>
      </div>

      <div class="central-panel">
        <div class="title">季度目标</div>
        <SeamlessScroll
          v-if="quarterlyGoals.length > 0"
          ref="goalsScrollRef"
          :data="quarterlyGoals"
          :class-option="goalsScrollOption"
          class="progress-bulk-container"
        >
          <div class="progress-content-container">
            <div
              v-for="(item, index) in quarterlyGoals"
              :key="item.userAgentName || index"
              class="progress-module"
            >
              <span class="name">{{ item.userAgentName }}</span>
              <div class="progress-container">
                <progress
                  :class="{ 'over-100': item.percentage > 99 }"
                  :value="item.percentage"
                  max="100"
                />
                <span class="progress-value">{{ item.percentage }}%</span>
                <span class="target">{{ item.goal }}</span>
              </div>
            </div>
          </div>
        </SeamlessScroll>
        <div v-else class="progress-bulk-container">
          <p style="padding-top: 20px; color: #aaa; text-align: center">
            暂无季度目标数据
          </p>
        </div>
      </div>

      <div class="right-panel">
        <div class="upper-right">
          <div class="title">转租/拼室友/私人房东</div>
          <table class="sublet-table fixed-header">
            <thead>
              <tr>
                <th>类型</th>
                <th>经纪人</th>
                <th>地点</th>
                <th>预算</th>
                <th>租期</th>
                <th>主观需求</th>
              </tr>
            </thead>
          </table>
          <SeamlessScroll
            v-if="coOpData.length > 0"
            ref="coOpScrollRef"
            :data="coOpData"
            :class-option="coOpScrollOption"
            class="right-table"
          >
            <table class="sublet-table">
              <tbody>
                <tr
                  v-for="(item, index) in coOpData"
                  :key="`${item.agent}-${item.location}-${index}`"
                >
                  <td>
                    <span class="clamp-text">{{ item.type }}</span>
                  </td>
                  <td>
                    <span class="clamp-text">{{ item.agent }}</span>
                  </td>
                  <td>
                    <span class="clamp-text">{{ item.location }}</span>
                  </td>
                  <td>
                    <span class="clamp-text">{{ item.budget }}</span>
                  </td>
                  <td>
                    <span class="clamp-text">{{ item.period }}</span>
                  </td>
                  <td style="text-align: left">
                    <span class="clamp-text">{{ item.demand }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </SeamlessScroll>
          <div v-else class="right-table">
            <p style="padding-top: 20px; color: #aaa; text-align: center">
              暂无转租等信息
            </p>
          </div>
        </div>
        <div class="lower-right" style="background-color: rgb(34 34 34 / 0%)">
          <CalendarComponent :showToolbar="false" maxHeight="100%" />
        </div>
      </div>
    </div>

    <div id="wrapper" class="notice">
      <SeamlessScroll
        v-if="noticeSegments.length > 0"
        ref="noticeScrollRef"
        :data="noticeSegments"
        :class-option="noticeScrollOption"
        class="seamless-warp-horizontal"
      >
        <div id="marquee" class="scrolling-text">
          <template v-for="(segment, index) in noticeSegments" :key="index">
            <span v-if="segment.type === 'text'">{{ segment.content }}</span>

            <PlaneIcon
              v-else-if="segment.type === 'icon' && segment.name === 'plane'"
              class="plane-icon"
              style="margin: 0 1px"
            />
            <span
              v-else-if="segment.type === 'styledText'"
              :class="segment.style"
              >{{ segment.content }}</span
            >
          </template>
        </div>
      </SeamlessScroll>
      <div v-else class="notice">&nbsp;</div>
    </div>

    <div class="footer">
      <div class="footer-section footer-logo">
        <img
          src="/assets/dashboard/logo.png"
          alt="Logo"
          class="footer-logo-image"
        />
        <div><span class="dashboard-text">Dashboard</span><sup> 3.0</sup></div>
      </div>
      <div id="current-time" class="footer-section footer-time">
        {{ currentTime }}
      </div>
      <div class="footer-section footer-info">
        <div id="dataperiod">{{ dataPeriodText }}</div>
        <div id="last-updated">{{ lastUpdatedText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { useDashboardData, formatNumberWithCommas } from "./dataHandler"; // Adjust path if needed
import SeamlessScroll from "@/components/ReSeamlessScroll"; // Adjust path as per your project structure
import PlaneIcon from "~icons/fa/plane";
import CalendarComponent from "@/views/bos-showing/calendar.vue";

defineOptions({
  name: "DashboardIndex"
});

// --- Get reactive data and methods from the composable ---
const {
  loading,
  error, // You might want to display this error state in the template
  currentTime,
  lastUpdatedText,
  noticeSegments,
  rankingTitle,
  dataPeriodText,
  performanceData,
  summary,
  quarterlyGoals,
  coOpData
} = useDashboardData();

// --- Seamless Scroll Setup ---

// Refs for scroll components (optional, needed for methods like reset)
const noticeScrollRef = ref();
const coOpScrollRef = ref();
const goalsScrollRef = ref();

// Options for Notice Marquee (Horizontal)
const noticeScrollOption = reactive({
  direction: "left",
  step: 0.5, // Adjust speed as needed
  limitMoveNum: 1 // Only scroll when content width > container width (auto usually)
  // hoverStop: true, // Optional: pause on hover
  // singleHeight: 0, // Not needed for horizontal
  //waitTime: 1000 // Optional: wait time before starting
});

// Options for Co-op Table (Vertical)
const coOpScrollOption = reactive({
  direction: "top",
  step: 0.5, // Adjust speed as needed
  limitMoveNum: 5 // Start scrolling when more than X items visible (adjust based on desired visible rows)
  // hoverStop: true, // Optional: pause on hover
  // singleHeight: 30, // Optional: Specify row height for step calculation, might improve smoothness
  //waitTime: 1000 // Optional: wait time before starting
});

// Options for Quarterly Goals (Vertical)
const goalsScrollOption = reactive({
  direction: "top",
  step: 0.5, // Adjust speed as needed
  limitMoveNum: 4 // Start scrolling when more than X items visible (adjust)
  // hoverStop: true, // Optional: pause on hover
  // singleHeight: 50, // Optional: Estimate average height
  //waitTime: 1000 // Optional: wait time before starting
});

// Optional: Reset scroll if data changes drastically, although usually handled internally
// watch(coOpData, () => {
//   coOpScrollRef.value?.reset();
// });
// watch(quarterlyGoals, () => {
//    goalsScrollRef.value?.reset();
// });
// watch(noticeContent, () => {
//   // Horizontal scroll might need a manual reset/recalc if text length changes significantly
//   noticeScrollRef.value?.reset();
// });
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=Dancing+Script&display=swap");
@import url("https://use.fontawesome.com/releases/v5.15.4/css/all.css");

/* --- Paste ALL CSS rules from the original HTML file here --- */

/* --- Make sure font path is correct if hosted locally --- */
@font-face {
  font-family: FZQingKeBenYueSong;
  src: url("/assets/dashboard/fz.ttf") format("truetype");

  /* Adjust path if font is in public folder */
}

/* 动画关键帧 */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

body,
html {
  /* 标准语法 */
  height: 100%;
  padding: 0;

  /* 确保整个网页大小与浏览器窗口一致 */
  margin: 0;
  overflow: hidden;

  /* 防止出现滚动条 */
  font-size: 1vw;

  /* 针对Chrome、Safari等浏览器 */

  /* 针对Firefox浏览器 */

  /* 针对IE、Edge浏览器 */
  user-select: none;

  /* background-image: url('bg.png'); */
  background-image: url("/assets/dashboard/cbf.webp");
  background-attachment: fixed;

  /* Prevents background scroll with page */
  background-position: center;

  /* Adjust path if image is in public folder */
  background-size: cover;

  /* 基于视口宽度的相对字体大小 */
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.dashboard {
  position: relative;
  display: flex;

  /* height: 86%; */

  /* Let flex-grow handle height */
  flex-grow: 1;
  gap: 0.5%;
  width: 99%;

  /* Takes remaining height */
  margin-top: 20px;
  margin-right: auto;

  /* 设置距离顶部30px */
  margin-left: auto;
  overflow: hidden;

  /* Contain children */
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5%;
  width: 35%;
}

.central-panel {
  display: flex;
  flex-direction: column;

  /* display: flex; */

  /* Already flex */
  gap: 0.5%;
  align-items: center;
  width: 12%;
  background-color: rgb(34 34 34 / 70%);

  /* 确保内容居中显示 */
}

.central-panel .title {
  flex-shrink: 0;

  /* 标题文字更大 */
  padding-top: 0.5em;
  font-family: FZQingKeBenYueSong, sans-serif;
  font-size: 1.5em;

  /* 标题文字颜色设置为白色 */
  font-weight: bold;
  color: white;

  /* 保持边距 */
  text-align: center;

  /* Prevent title from shrinking */
}

/* --- Styles for SeamlessScroll Wrapper (Goals) --- */
.progress-bulk-container {
  /* IMPORTANT for SeamlessScroll */
  position: relative;

  /* height: calc(100% - 2em); */

  /* Let flex handle height */
  flex-grow: 1;
  width: 95%;

  /* Takes remaining space */
  overflow: hidden;

  /* Needed if using absolute positioned children */
}

.central-panel .progress-module {
  position: relative;
  width: 100%;

  /* Adjusted from 2vh for consistency */
  margin-top: 10px;

  /* 使模块填充整个父容器宽度 */
  font-size: 1.1em;

  /* 设置相对定位，便于子元素使用绝对定位 */
}

.central-panel .name {
  margin-bottom: 5px;
  color: white;

  /* 名称与进度条容器之间的间隔 */
  text-align: center;

  /* Center name */
}

.central-panel .progress-container {
  /* 对齐进度条和目标数字 */
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;

  /* Position context for value */
}

.central-panel progress {
  flex-grow: 1;
  height: 15px;

  /* position: relative; */

  /* Not needed here */
  margin: 0 5px;

  /* 进度条的高度 */
  appearance: none;

  /* Add some horizontal space */
}

.central-panel .progress-value {
  position: absolute;

  /* 水平居中 */
  top: 50%;
  left: 50%;

  /* Improve visibility */
  z-index: 1;
  font-size: 12px;

  /* Fine-tune size */
  font-weight: bold;

  /* 确保完全居中 */
  color: white;
  text-shadow: 1px 1px 1px rgb(0 0 0 / 70%);

  /* 确保文字显示在进度条之上 */
  pointer-events: none;

  /* Vertical centering */
  transform: translate(-50%, -50%);

  /* Don't interfere with hover */
}

.central-panel .target {
  /* 在进度条和文字之间留出一点空间 */
  min-width: 25px;

  /* Adjust size */
  margin-left: 5px;

  /* Align target to the right */
  font-size: 13px;
  color: white;
  text-align: right;

  /* Ensure some space for target number */
}

.central-panel progress::-webkit-progress-bar {
  background-color: #979797;
  border-radius: 7px;
}

.central-panel progress::-webkit-progress-value {
  background-color: #f95865;
  border-radius: 7px;
}

.central-panel progress::-moz-progress-bar {
  background-color: #f95865;
  border-radius: 7px;
}

/* 添加一个新类用于进度条超过100% */
.central-panel .over-100::-webkit-progress-value {
  background-color: #4caf50;

  /* Green表示超过100% */
}

.central-panel .over-100::-moz-progress-bar {
  background-color: #4caf50;

  /* Green表示超过100% */
}

/* Hide scrollbar specifically for the wrapper if needed, though overflow: hidden should suffice */

/* .progress-bulk-container::-webkit-scrollbar { display: none; } */

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5%;
  width: 56%;
}

.upper-left,
.lower-left > div,
.upper-right,
.lower-right {
  /* Add padding for internal spacing */
  box-sizing: border-box;
  padding: 1em;

  /* Applied to children of lower-left too */
  background-color: rgb(34 34 34 / 70%);

  /* Include padding in width/height */
}

/* Override padding for specific elements if needed */
.upper-right,
.lower-right {
  padding: 0;

  /* Reset padding as internal elements handle it */
}

.upper-left {
  display: flex;
  flex: 65%;

  /* Enable flex for title + table */
  flex-direction: column;

  /* Stack title and table */
  padding: 0.5em 1em 1em;

  /* Adjust padding */
}

.lower-left {
  display: flex;
  flex: 35%;
  gap: 1%;

  /* Container itself is transparent */
  padding: 0 !important;
  background-color: transparent !important;

  /* No padding on the container */
}

.left-section,
.middle-section,
.right-section,
.xhs-section {
  /* background-color: rgba(34, 34, 34, 0.7); */

  /* Moved to parent rule */
  display: flex;

  /* padding: 1em; */

  /* Moved to parent rule */
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  /* Equal width */
  min-width: 0;
  color: white;
  text-align: center;

  /* Allow shrinking */
}

.upper-left .title {
  flex-shrink: 0;

  /* 标题文字更大 */
  padding: 0.5em;

  /* Adjust padding */
  padding-bottom: 0.5em;
  font-family: FZQingKeBenYueSong, sans-serif;
  font-size: 1.7em;

  /* 标题文字颜色设置为白色 */
  font-weight: bold;
  color: white;
  text-align: center;

  /* Don't shrink title */
}

.performance-table {
  /* Fill container */

  /* height: calc(85% - 15px); */

  /* Let flex handle height */
  flex-grow: 1;

  /* Removed .central-ranking-table as it's not used */
  width: 100%;

  /* 固定表格布局 */
  overflow: hidden;

  /* 透明底色 */
  font-size: 1.4em;

  /* 表格内的字体 */
  color: white;

  /* 表格文字颜色设置为白色 */
  table-layout: fixed;

  /* Take remaining space */

  /* margin: 0 auto; */

  /* Not needed with width 100% */
  border-collapse: collapse;
  background-color: transparent;

  /* Hide potential overflow within table */
}

.performance-table th,
.performance-table td {
  /* Darker line */
  padding: 6px 4px;

  /* 防止内容换行 */
  overflow: hidden;

  /* 超出部分隐藏 */
  text-overflow: ellipsis;
  font-weight: normal;

  /* 超出部分显示省略号 */

  /* height: 16.67%; */

  /* Remove fixed height, let content decide or use line-height */
  line-height: 1.4;

  /* Adjust padding */
  vertical-align: middle;

  /* Less bold */
  text-align: center;

  /* 垂直居中对齐 */
  white-space: nowrap;
  border-bottom: 1px solid #979797;

  /* Adjust line height for better spacing */
}

.performance-table th {
  font-weight: bold;

  /* Keep header bold */
  color: #eee;
}

.performance-table tr:last-child td {
  border-bottom: none;
}

.section-title {
  margin-bottom: 0.5em;

  /* height: 40%; */

  /* Avoid fixed height */
  font-size: 1.3em;

  /* Adjust size */
  font-weight: bold;

  /* 标题和数字之间的间距 */
  line-height: 1.2;
}

.section-number {
  font-size: 1.8em;

  /* Adjust size */
  font-weight: bold;
}

.footer {
  position: relative;
  display: flex;
  flex-shrink: 0;
  width: 97%;
  height: 7%;

  /* Keep fixed height for footer */
  min-height: 50px;
  margin: 0.4% auto 0.2%;

  /* Ensure minimum height */
  color: white;

  /* Prevent footer from shrinking */
}

.footer-section {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  text-align: left;
  text-shadow: 2px 2px 15px rgb(252 103 110 / 50%);
}

.footer-section:first-child {
  justify-content: flex-start;
}

.footer-section:last-child {
  justify-content: flex-end;
}

.dashboard-text {
  /* Adjust size */
  font-family: "Dancing Script", cursive;
  font-size: 2.5em;

  /* 使用引入的花体字 */
}

.footer-logo img {
  height: 55%;
  max-height: 40px;

  /* Max logo height */
  margin-right: 0.5em;
}

.dashboard-text sup {
  font-size: 0.4em;

  /* Adjust size relative to dashboard-text */
}

.footer-time {
  /* color: black; */
  font-size: 1.8em;

  /* Adjust size */
  font-weight: bold;
}

.footer-info {
  display: flex;
  flex-direction: column;

  /* Vertical center */
  align-items: flex-end;

  /* 设置为列方向布局 */
  justify-content: center;

  /* Align text to the right */
  padding-right: 1em;

  /* Add some padding */
}

.footer-info div {
  display: block;

  /* Right-align text */
  margin-bottom: 0.3em;
  font-size: 1em;

  /* 明确设置为块级元素 */
  text-align: right;

  /* Adjust spacing */
  white-space: nowrap;
}

.footer-info img.footer-qr-code {
  width: 50px;

  /* 或您希望的尺寸 */
  height: 50px;

  /* 或您希望的尺寸 */
  margin-top: 0.5em;

  /* 与文本之间的间距 */
}

.upper-right {
  display: flex;
  flex-direction: column;
  height: 55%;

  /* Add background here */
  overflow: hidden;

  /* Stack title and scroll area */
  background-color: rgb(34 34 34 / 70%);

  /* Crucial */
}

.lower-right {
  height: 45%;

  /* background is transparent via inline style */
  overflow: hidden;

  /* Hide iframe scrollbars potentially */
}

/* Styles for SeamlessScroll Wrapper (Co-op) */
.right-table {
  /* Add margin around the scroll area */
  position: relative;

  /* height: calc(86% - 2em); */

  /* Let flex handle height */
  flex-grow: 1;

  /* IMPORTANT for SeamlessScroll */
  margin: 0 1em 0.5em;

  /* Take remaining space in upper-right */
  overflow: hidden;
}

.right-lower-table {
  /* Potentially unused now? */

  /* height: calc(85% - 2em); */
  overflow: hidden;

  /* Was overflow-y: auto */
}

.right-table::-webkit-scrollbar,
.right-lower-table::-webkit-scrollbar {
  display: none;

  /* Hide scrollbar specifically for the wrapper if needed */
}

.upper-right .title,
.lower-right .title {
  /* Space below title */
  flex-shrink: 0;
  padding-top: 0.5em;
  margin-bottom: 5px;

  /* Lower right doesn't have a title */
  font-family: FZQingKeBenYueSong, sans-serif;
  font-size: 1.5em;
  font-weight: bold;
  color: white;
  text-align: center;

  /* Prevent title shrinking */
}

/* Fixed Header for Co-op Table */
.sublet-table.fixed-header {
  flex-shrink: 0;
  width: calc(100% - 2em);

  /* Match scrollable table width */
  margin: 0 auto;
  table-layout: fixed;

  /* Center header */
  border-collapse: collapse;

  /* Prevent header shrinking */
}

.sublet-table.fixed-header th {
  /* Example: Reduced from 1.3em */

  /* CHANGE HERE: Optionally reduce padding */
  padding: 6px 10px;
  overflow: hidden;
  text-overflow: ellipsis;

  /* CHANGE HERE: Reduce font-size */
  font-size: 1.1em;
  vertical-align: middle;
  color: #eee;
  text-align: center;
  white-space: nowrap;
  background-color: rgb(50 50 50 / 80%);

  /* Example: Reduced vertical padding */

  border-bottom: 1px solid #666;
}

/* Scrollable Co-op Table (Inside SeamlessScroll) */
.sublet-table {
  /* Applied to table inside .right-table now */
  width: 100%;
  font-size: 1.2em;

  /* Adjust font size */
  color: white;
  table-layout: fixed;

  /* Fill scroll wrapper */

  /* margin: 0 auto; */

  /* Not needed */
  border-collapse: collapse;
  background-color: transparent;
}

/* Find and modify this rule */
.sublet-table th,
.sublet-table td {
  /* white-space: nowrap; */

  /* Ensure this is NOT active or removed */
  padding: 8px 10px;

  /* Keep vertical alignment */
  overflow: hidden;
  vertical-align: middle;
  text-align: center;
  border-bottom: 1px solid #979797;

  /* Optional: parent cell overflow control */

  /* display: -webkit-box; */

  /* -webkit-box-orient: vertical; */

  /* -webkit-line-clamp: 2; */

  /* word-break: break-all; */
}

/* Keep the rule for the last column alignment if needed */
.sublet-table td:nth-child(6) {
  text-align: left;
}

/* Add this new rule */
.clamp-text {
  display: -webkit-box;

  /* Limit to 2 lines */
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  line-clamp: 2;

  /* Allow breaking long words */

  /* Optional: Adjust line-height if needed for better spacing */
  line-height: 1.4;

  /* Allows breaking long words that overflow, but prefers whole words */
  hyphens: auto;

  /* Show ellipsis for truncated text */
  overflow-wrap: break-word;
  -webkit-box-orient: vertical;

  /* Ensure it behaves like a block within the cell for clamping */

  /* max-height: calc(2 * 1.4em); /* Fallback using line-height, less reliable */
}

/* Column Widths (Apply to both header th and body td if using fixed layout) */
.sublet-table th:nth-child(1),
.sublet-table td:nth-child(1) {
  width: 9%;
}

/* 类型 */
.sublet-table th:nth-child(2),
.sublet-table td:nth-child(2) {
  width: 14%;
}

/* 经纪人 */
.sublet-table th:nth-child(3),
.sublet-table td:nth-child(3) {
  width: 16%;
}

/* 地点 */
.sublet-table th:nth-child(4),
.sublet-table td:nth-child(4) {
  width: 9%;
}

/* 预算 */
.sublet-table th:nth-child(5),
.sublet-table td:nth-child(5) {
  width: 12%;
}

/* 租期 */
.sublet-table th:nth-child(6),
.sublet-table td:nth-child(6) {
  width: 40%;
  text-align: left;
  white-space: normal;
}

/* 主观需求 - allow wrap, left align */

/* Remove last border from last row in scrolling table */
.sublet-table tr:last-child td {
  border-bottom: none;
}

/* Viewing Table Styles (If used elsewhere, keep or remove) */
.viewing-table th:nth-child(1),
.viewing-table td:nth-child(1) {
  width: 16%;
}

.viewing-table th:nth-child(2),
.viewing-table td:nth-child(2) {
  width: 15%;
}

.viewing-table th:nth-child(3),
.viewing-table td:nth-child(3) {
  width: 16%;
}

.viewing-table th:nth-child(4),
.viewing-table td:nth-child(4) {
  width: 15%;
}

.viewing-table th:nth-child(5),
.viewing-table td:nth-child(5) {
  width: 38%;
  text-align: left;
}

.notice {
  position: relative;

  /* Prevent shrinking */
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  width: 100%;
  height: 3vh;

  /* Keep vh for notice height */
  min-height: 25px;

  /* IMPORTANT for SeamlessScroll */
  margin-top: 0.4%;
  margin-right: auto;

  /* Match height */
  margin-left: auto;
  overflow: hidden;
  line-height: 3vh;

  /* Keep flex */
  color: white;

  /* Vertical centering */
  background-color: rgb(34 34 34 / 70%);
}

/* Styles for SeamlessScroll Wrapper (Notice) */
.seamless-warp-horizontal {
  width: 100%;

  /* Ensure wrapper hides overflow */
  height: 100%;
  overflow: hidden !important;
}

.seamless-warp-horizontal .scrolling-text {
  /* Keep nowrap */
  letter-spacing: 1px;

  /* display: flex; */

  /* SeamlessScroll might handle this */

  /* left: 100%; */

  /* SeamlessScroll handles positioning */
  white-space: nowrap;

  /* Adjust spacing */

  /* The component usually requires the content to be wider than the container */

  /* display: inline-block; */

  /* Try this if flex doesn't work */
}

.fas.fa-plane {
  margin: 0 1em;
  transform: scaleX(-1);

  /* Add space around icon */
}

.scrolling-text span {
  /* margin-left: 100px; */

  /* Spacing handled by duplication or component */
  display: inline-block;

  /* Ensure span takes space */
  padding: 0 10px;

  /* Add padding between duplicated content */
}

/* Loading Overlay样式 */
#loading-overlay {
  position: fixed;

  /* 固定位置 */
  top: 0;
  left: 0;

  /* 水平居中对齐 */
  z-index: 1000;

  /* Darker semi-transparent background */
  display: flex;
  flex-direction: column;

  /* Stack icon and text */
  align-items: center;

  /* 垂直居中对齐 */
  justify-content: center;
  width: 100%;

  /* 全屏 */
  height: 100%;

  /* 确保它在页面顶层 */
  text-shadow: 2px 2px 4px rgb(0 0 0 / 50%);
  background: rgb(0 0 0 / 60%);

  /* 水平偏移，垂直偏移，模糊半径，颜色 */
  opacity: 1;
  transition: opacity 0.5s ease-out;
}

/* Add fade-out effect if needed via Vue's <transition> */

/* 转圈动画 */
.loader {
  margin-bottom: 15px;
  font-size: 4vh;
  color: #3498db;

  /* border: 4px solid #f3f3f3; */

  /* Lighter grey */

  /* border-top: 4px solid #3498db; */

  /* Blue */
  border-radius: 50%;

  /* width: 50px;
  height: 50px; */
  animation: spin 2s linear infinite;

  /* Space between icon and text */
}

/* 文本样式 */
.loadingText {
  font-size: 2.5vh;

  /* Adjust size */
  color: #fff;
}

.plane-icon {
  /* Align with text */
  display: inline-block;

  /* Keep the flip if needed */
  vertical-align: middle;
  transform: scaleX(-1);

  /* Ensure proper spacing */

  /* Add color, size adjustments if needed */
}

.soulC {
  font-style: italic;

  /* Make sure this style exists */
  text-decoration: line-through;
  text-decoration-thickness: 2px;

  /* Add any other specific styling */
}

/* Import Fonts */
</style>
