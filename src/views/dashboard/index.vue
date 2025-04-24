<template>
  <div class="dashboard-container">
    <div v-if="isLoading" id="loadingOverlay">
      <div class="loader"><i class="fas fa-sync fa-spin"></i></div>
      <p class="loadingText">&nbsp; 正在更新数据……</p>
    </div>

    <div class="dashboard">
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
              <tr v-for="(item, index) in performanceData" :key="index">
                <td>{{ index + 1 }}</td>
                <td>{{ item.userAgentName }}</td>
                <td>{{ item.rentAmountPendingClose }}</td>
                <td>{{ item.rentDealsPendingClose }}</td>
                <td>{{ item.showingCount }}</td>
                <td>{{ item.videoCount !== undefined ? item.videoCount : 'N/A' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="lower-left">
          <div class="lower-left-inner">
            <div class="left-section">
              <div class="section-title">业绩<br>中位数</div>
              <div class="section-number">{{ summaryData.medianRentAmountPendingClose }}</div>
            </div>
            <div class="middle-section">
              <div class="section-title">订单<br>总数</div>
              <div class="section-number">{{ summaryData.totalRentDealsPendingClose }}</div>
            </div>
            <div class="right-section">
              <div class="section-title">订单<br>均值</div>
              <div class="section-number">{{ summaryData.averageRentPerDeal }}</div>
            </div>
            <div class="xhs-section">
              <div class="section-title">美国市场<br>单均值</div>
              <div class="section-number">{{ summaryData.averageUSMarket !== undefined ? summaryData.averageUSMarket :
                'N/A' }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="central-panel">
        <div class="title">季度目标</div>
        <div id="progress-bulk-container" ref="progressBulkContainer">
          <div id="progress-content-container" ref="progressContentContainer">
            <div class="progress-module" v-for="(item, index) in quarterlyGoals" :key="index">
              <span class="name">{{ item.userAgentName }}</span>
              <div class="progress-container">
                <progress :class="{ 'over-100': item.percentage > 99 }" :value="item.percentage" max="100"></progress>
                <span class="progress-value">{{ item.percentage }}%</span>
                <span class="target">{{ item.goal }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="upper-right">
          <div class="title">转租/拼室友/私人房东</div>
          <table class="sublet-table">
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
          <div class="right-table" id="tableforcoDiv" ref="tableForCoDiv">
            <table class="sublet-table" id="tableforco" ref="tableForCo">
              <tbody id="sublet-table-body">
                <tr v-for="(item, index) in subletItems" :key="index">
                  <td>{{ item.type }}</td>
                  <td>{{ item.agent }}</td>
                  <td>{{ item.location }}</td>
                  <td>{{ item.budget }}</td>
                  <td>{{ item.period }}</td>
                  <td>{{ item.demand }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="lower-right" style="background-color: rgba(34, 34, 34, 0);">
          <iframe id="gCal" src="https://portal.uswoo.cn/agent/calendar/calendar.html" style="opacity: 0.9;"
            width="100%" height="100%" frameborder="0" scrolling="no"></iframe>
        </div>
      </div>
    </div>

    <div class="notice" id='wrapper' ref="marqueeWrapper">
      <div class="scrolling-text" id='marquee' ref="marquee">
        <span id='marqueeContent' ref="marqueeContent1"></span>
        <span id='marqueeContent1-clone' ref="marqueeContent2"></span>
        <span id='marqueeContent2-clone' ref="marqueeContent3"></span>
        <span class="soulC"></span>
      </div>
    </div>


    <div class="footer">
      <div class="footer-section footer-logo">
        <img src="/assets/dashboard/logo.png" alt="Logo" class="footer-logo-image">
        <div><span class="dashboard-text">Dashboard</span><sup> 3.0</sup></div>
      </div>
      <div class="footer-section footer-time" id="current-time">
        {{ currentTime }}
      </div>
      <div class="footer-section footer-info">
        <div id="dataperiod">{{ dataPeriodText }}</div>
        <div id="last-updated"><span>{{ lastUpdatedText }}</span>前更新</div>
      </div>
    </div>
  </div>
</template>

<script>
// Assume jQuery and seamscroll are loaded globally before this component is mounted
// If not using global imports, you would need to import them:
// import $ from 'jquery'; // Might need adjustment depending on jQuery module export
// import seamscroll from '@asset/dashboard/seamscroll.min.js'; // If seamscroll is a module

const API_ROOT = "https://portal.uswoo.cn/agent/api/";

export default {
  name: 'Dashboard',
  data() {
    return {
      isLoading: true,
      globalData: null,
      periodSwitch: 1, // 1: 本月, 2: 近一个月, 3: 本季度
      fillIntervalId: null,
      updateLastUpdatedIntervalId: null,
      updateCurrentTimeIntervalId: null,
      animationFrameId: null, // For marquee
      soulIndex: 0, // For marquee
      marqueeDistance: 0, // For marquee position ( translateX )
      firstMove: true, // For marquee initial setup
      lastUpdatedTimestamp: null, // Use timestamp for calculations
      retryCount: 0,
      maxRetries: 3,

      // Data properties bound to the template
      currentTime: '',
      rankingTitle: '个人业绩排名',
      dataPeriodText: '数据范围：近一个月',
      performanceData: [],
      summaryData: {
        medianRentAmountPendingClose: 'N/A',
        totalRentDealsPendingClose: 'N/A',
        averageRentPerDeal: 'N/A',
        averageUSMarket: 'N/A',
      },
      subletItems: [],
      quarterlyGoals: [],
      noticeContent: '',
      lastUpdatedText: '未知'
    };
  },
  computed: {
    // Consider adding computed properties if logic becomes more complex
  },
  methods: {
    // --- Time Updates ---
    updateLastUpdatedTime() {
      if (this.lastUpdatedTimestamp) {
        const currentTime = new Date();
        const diff = currentTime - this.lastUpdatedTimestamp;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        this.lastUpdatedText = `${minutes}分${seconds}秒`;
      } else {
        this.lastUpdatedText = '刚刚';
      }
    },

    getCurrentDateTime() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },

    updateTime() {
      this.currentTime = this.getCurrentDateTime();
    },

    // --- Data Fetching & Processing ---
    isDataInvalid(data) {
      // Check if essential data properties exist
      return (
        !data ||
        !data.notice ||
        !data.top_sales_data ||
        !data.summary ||
        !data.thismonthtop_sales_data ||
        !data.thismonthsummary ||
        !data.thisquartertop_sales_data || // Added this quarter checks based on fillRankingData logic
        !data.thisquartersummary || // Added this quarter checks
        !data.soulC ||
        !data.formattedCoValues ||
        !data.thisquartergoalsummary
      );
    },

    loadData() {
      console.log('Fetching data...');
      // Assuming jQuery is available globally
      $.ajax({
        url: `${API_ROOT}dashboard/data_fetch.php`,
        type: "GET",
        dataType: "json",
        context: this, // Set context to the Vue component instance
        success: (data) => {
          console.log('Data fetched successfully:', data);
          this.retryCount = 0;
          if (this.isDataInvalid(data)) {
            console.warn('Fetched data is incomplete or invalid. Retrying...');
            // If data is invalid, retry after a delay
            if (this.retryCount < this.maxRetries) {
              this.retryCount++;
              setTimeout(this.loadData, 3000);
            } else {
              console.error('Max retry limit reached for invalid data. Stopping attempts.');
              this.isLoading = false; // Hide loading if max retries hit
            }
            return;
          }

          this.globalData = data;
          this.lastUpdatedTimestamp = new Date();
          this.updateLastUpdatedTime(); // Update immediately after data arrives

          // Populate static parts initially (or update)
          this.subletItems = data.formattedCoValues.filter(item => item.status === "Open");
          this.quarterlyGoals = data.thisquartergoalsummary;
          this.noticeContent = data.notice; // Store notice content

          // Initial fill of ranking data based on current periodSwitch
          this.fillRankingData();

          // Set up periodic ranking data update
          if (this.fillIntervalId) clearInterval(this.fillIntervalId);
          this.fillIntervalId = setInterval(this.fillRankingData, 15000); // Updates ranking table every 15s

          // Set up periodic 'last updated' time update
          if (this.updateLastUpdatedIntervalId) clearInterval(this.updateLastUpdatedIntervalId);
          this.updateLastUpdatedIntervalId = setInterval(this.updateLastUpdatedTime, 1000); // Updates last updated every 1s


          // Initialize scrolling libraries after DOM is potentially updated
          // Use nextTick to ensure Vue has rendered the data
          this.$nextTick(() => {
            console.log('Initializing scrolling...');
            this.initScrolling();
            this.initMarquee(); // Re-initialize marquee with new content
            console.log('Scrolling initialized.');
          });

          this.isLoading = false; // Hide loading overlay on success
        },
        error: (jqXHR, textStatus, errorThrown) => {
          console.error("Error loading data: " + textStatus, errorThrown);
          this.retryCount++;
          if (this.retryCount < this.maxRetries) {
            console.log(`Retrying data fetch... Attempt ${this.retryCount + 1}/${this.maxRetries}`);
            setTimeout(this.loadData, 3000);
          } else {
            console.error("Max retry limit reached for fetch error. Stopping attempts.");
            this.isLoading = false; // Hide loading if max retries hit
          }
        },
      });
    },

    // Cycles through data periods and updates ranking/summary data properties
    fillRankingData() {
      if (!this.globalData) return;

      let topSalesData, summaryData, rankingTitle, dataPeriodText;

      if (this.periodSwitch === 1) {
        // This Month
        topSalesData = this.globalData.thismonthtop_sales_data;
        summaryData = this.globalData.thismonthsummary;
        rankingTitle = "个人业绩排名-本月";
        dataPeriodText = "数据范围：本月";
        this.periodSwitch = 2; // Next will be last month
      } else if (this.periodSwitch === 2) {
        // Last Month (Original code said 近一个月 - "nearly one month")
        topSalesData = this.globalData.top_sales_data; // Assuming this corresponds to '近一个月'
        summaryData = this.globalData.summary; // Assuming this corresponds to '近一个月'
        rankingTitle = "个人业绩排名：近一个月";
        dataPeriodText = "数据范围：近一个月";
        this.periodSwitch = 3; // Next will be this quarter
      } else if (this.periodSwitch === 3) {
        // This Quarter
        topSalesData = this.globalData.thisquartertop_sales_data;
        summaryData = this.globalData.thisquartersummary;
        rankingTitle = "个人业绩排名-本季度";
        dataPeriodText = "数据范围：本季度";
        this.periodSwitch = 1; // Loop back to this month
      }

      // Update the data properties that are bound to the template
      this.performanceData = topSalesData;
      this.summaryData = summaryData; // Directly bind summaryData object
      this.rankingTitle = rankingTitle;
      this.dataPeriodText = dataPeriodText;
    },

    // --- Scrolling Initialization (Seamscroll) ---
    initScrolling() {
      // Assuming seamscroll is available globally
      if (window.seamscroll && typeof window.seamscroll.init === 'function') {
        // Initialize Sublet Table Scrolling
        const subletTable = this.$refs.tableForCo;
        const tableForCoDiv = this.$refs.tableForCoDiv;
        if (subletTable && tableForCoDiv) {
          const scrollTableHeight = subletTable.offsetHeight;
          const tableHeight = tableForCoDiv.offsetHeight;
          console.log(`Sublet Table Height: ${scrollTableHeight}, Container Height: ${tableHeight}`);
          if (scrollTableHeight > tableHeight) {
            // Destroy existing seamscroll instance if it exists before initializing
            if (subletTable.seamscrollInstance) {
              subletTable.seamscrollInstance.destroy();
            }
            subletTable.seamscrollInstance = seamscroll.init({ // Store instance on element
              dom: subletTable,
              step: 0.5,
            });
            console.log('Sublet Table Scrolling Initialized.');
          } else if (subletTable.seamscrollInstance) {
            // If content shrinks, destroy instance
            subletTable.seamscrollInstance.destroy();
            subletTable.seamscrollInstance = null;
            console.log('Sublet Table Scrolling Destroyed.');
          }
        } else {
          console.warn('Seamscroll: Sublet table elements not found via refs.');
        }

        // Initialize Quarterly Goals Scrolling
        const progressContentContainer = this.$refs.progressContentContainer;
        const progressBulkContainer = this.$refs.progressBulkContainer;
        if (progressContentContainer && progressBulkContainer) {
          const scrollTableHeight2 = progressContentContainer.offsetHeight;
          const tableHeight2 = progressBulkContainer.offsetHeight;
          console.log(`Quarterly Goals Height: ${scrollTableHeight2}, Container Height: ${tableHeight2}`);
          if (scrollTableHeight2 > tableHeight2) {
            // Destroy existing seamscroll instance
            if (progressContentContainer.seamscrollInstance) {
              progressContentContainer.seamscrollInstance.destroy();
            }
            progressContentContainer.seamscrollInstance = seamscroll.init({ // Store instance
              dom: progressContentContainer,
              step: 0.5,
            });
            console.log('Quarterly Goals Scrolling Initialized.');
          } else if (progressContentContainer.seamscrollInstance) {
            // If content shrinks, destroy instance
            progressContentContainer.seamscrollInstance.destroy();
            progressContentContainer.seamscrollInstance = null;
            console.log('Quarterly Goals Scrolling Destroyed.');
          }
        } else {
          console.warn('Seamscroll: Quarterly goals elements not found via refs.');
        }
      } else {
        console.warn('Seamscroll library not found or not initialized globally.');
      }
    },


    // --- Marquee Logic (Adapted from Original) ---
    initMarquee() {
      // This function sets up the content and initial state, then starts the animation loop
      const $wrapper = $(this.$refs.marqueeWrapper);
      const $marquee = $(this.$refs.marquee);
      const $marqueeContent1 = $(this.$refs.marqueeContent1);
      const $marqueeContent2 = $(this.$refs.marqueeContent2);
      const $marqueeContent3 = $(this.$refs.marqueeContent3); // Use the third span

      if (!$wrapper.length || !$marquee.length || !$marqueeContent1.length || !$marqueeContent2.length || !$marqueeContent3.length) {
        console.error('Marquee elements not found via refs.');
        return; // Exit if elements aren't ready
      }

      // Clear previous content and set new
      const content = this.noticeContent || ''; // Use component data
      $marqueeContent1.html(content);
      $marqueeContent2.html(content);
      $marqueeContent3.html(content); // Set content for the third span too

      // Append soulC element if it doesn't exist or update it
      let $soulC = $marquee.find('.soulC');
      if ($soulC.length === 0) {
        $soulC = $('<span class="soulC"></span>').appendTo($marquee);
      }
      $soulC.text(this.globalData?.soulC?.[0] || ''); // Set initial soulC text


      // Recalculate initial distance if needed (e.g., on content change)
      if (this.firstMove) {
        this.marqueeDistance = 0; // Start from right edge initially
        this.firstMove = false;
      }

      // Reset soul index
      this.soulIndex = 0;


      // Cancel previous animation frame
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }

      // Start the animation loop
      this.updateMarqueePosition(2, 'left'); // Speed 2, direction left
    },

    updateMarqueePosition(speed, direction) {
      // This function performs the animation step

      const $wrapper = $(this.$refs.marqueeWrapper);
      const $marquee = $(this.$refs.marquee);
      const $marqueeContent1 = $(this.$refs.marqueeContent1);
      const $marqueeContent2 = $(this.$refs.marqueeContent2);
      const $marqueeContent3 = $(this.$refs.marqueeContent3);
      const $soulC = $marquee.find('.soulC');

      if (!$wrapper.length || !$marquee.length || !$marqueeContent1.length || !$marqueeContent2.length || !$marqueeContent3.length || !$soulC.length) {
        console.error('Marquee elements missing for update.');
        this.animationFrameId = null; // Stop animation if elements disappear
        return;
      }

      // --- Marquee logic adapted ---
      // Original logic checked if an element fully left the wrapper to reset distance and update soulC
      // We need to check based on the position of the *first* content element
      const wrapperLeft = $wrapper.offset().left;
      const content1Right = $marqueeContent1.offset().left + $marqueeContent1.width();

      if (direction === "left") {
        // If the first content element has moved completely past the left edge of the wrapper
        if (content1Right < wrapperLeft) {
          // Update soulC text from globalData.soulC array, looping if needed
          if (this.globalData && this.globalData.soulC && this.globalData.soulC.length > 0) {
            this.soulIndex = (this.soulIndex + 1) % this.globalData.soulC.length;
            $soulC.text(this.globalData.soulC[this.soulIndex]);
          }
          // Reset position to the right, behind the third element
          // Calculate position to place the first content after the third content + some gap
          const contentWidth = $marqueeContent1.width(); // Assuming all content spans have same width
          const currentTotalWidth = $marqueeContent1.width() + $marqueeContent2.width() + $marqueeContent3.width(); // Total width of content spans
          const gap = 20; // A small gap between repeated content, adjust as needed in CSS/logic

          // Calculate required translation to move content1 back to be after content3 with a gap
          // current content1 left = wrapperLeft + this.marqueeDistance
          // we want content1 left = content3 left + content3.width() + gap
          // New this.marqueeDistance = (content3 left + content3.width() + gap) - wrapperLeft
          // Let's simplify: Reset the entire marquee position when the first element exits
          this.marqueeDistance = $wrapper.width(); // Reset to start from the right edge
          // Or better, shift elements around if using multiple spans
          // A more robust approach for seamless scrolling with multiple spans involves checking when
          // the *second* span becomes visible and moving the *first* span to the end.
          // Let's simplify based on the original concept of resetting when the first exits.
          // When the first item exits the left view, reset the entire translateX position
          // so that the first item reappears after the last item.
          // Total width of the content that needs to scroll before looping is roughly content1.width + content2.width + content3.width
          // We need to move it back by this amount whenever content1 goes off-screen.
          const totalContentWidth = $marqueeContent1.width() + $marqueeContent2.width() + $marqueeContent3.width();
          this.marqueeDistance += totalContentWidth; // Move the wrapper forward by the total content width

        }
        this.marqueeDistance -= speed; // Move left
      }
      // else if (direction === "right") { ... add rightward logic if needed }


      // Apply the translation
      $marquee.css("transform", `translateX(${this.marqueeDistance}px)`);

      // Request the next frame
      this.animationFrameId = requestAnimationFrame(() => this.updateMarqueePosition(speed, direction));
    },


    // --- Lifecycle Hooks ---
    initApp() {
      console.log('Dashboard component mounted. Initializing...');
      // Initial fade-in animation (adapted from original)
      // In a typical Vue app, you'd use CSS transitions/animations or libraries
      // Keeping original jQuery animation for exact visual match initially
      $(".dashboard div")
        .css({ display: "none", opacity: "0" })
        .slideDown("slow")
        .animate({ opacity: "1" }, { queue: false, duration: "slow" });

      // Start time update intervals
      this.updateTime(); // Initial time update
      this.updateCurrentTimeIntervalId = setInterval(this.updateTime, 1000); // Update current time every 1s

      // Load data initially
      this.loadData();

      // Set up periodic data reload (every 10 minutes)
      // Store this interval ID if needed for cleanup, though original code didn't clear this one
      // this.dataLoadIntervalId = setInterval(this.loadData, 10 * 60 * 1000);
      setInterval(this.loadData, 10 * 60 * 1000); // Keeping original behavior for simplicity

      console.log('Initialization complete.');
    }
  },
  mounted() {
    // The component is mounted, and the DOM is ready.
    // We can now perform initial DOM manipulations and start processes.
    // Ensure jQuery and seamscroll are loaded and available globally before this runs.
    if (typeof $ === 'undefined') {
      console.error('jQuery not found. Please ensure it is loaded globally before the Vue app mounts.');
      this.isLoading = false; // Hide loading if jQuery is missing
      return;
    }
    if (typeof seamscroll === 'undefined' && this.$refs.tableForCo) { // Only warn if seamscroll is likely needed
      console.warn('Seamscroll not found. Scrolling features might not work.');
    }


    this.initApp(); // Start the initialization process
  },
  beforeUnmount() {
    // Component is about to be unmounted. Clean up timers and animation frames.
    console.log('Dashboard component unmounting. Cleaning up intervals and animation frames.');
    if (this.fillIntervalId) clearInterval(this.fillIntervalId);
    if (this.updateLastUpdatedIntervalId) clearInterval(this.updateLastUpdatedIntervalId);
    if (this.updateCurrentTimeIntervalId) clearInterval(this.updateCurrentTimeIntervalId);
    // if (this.dataLoadIntervalId) clearInterval(this.dataLoadIntervalId); // If you saved this ID

    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    // Destroy seamscroll instances if they exist
    const subletTable = this.$refs.tableForCo;
    if (subletTable && subletTable.seamscrollInstance) {
      subletTable.seamscrollInstance.destroy();
      subletTable.seamscrollInstance = null;
    }
    const progressContentContainer = this.$refs.progressContentContainer;
    if (progressContentContainer && progressContentContainer.seamscrollInstance) {
      progressContentContainer.seamscrollInstance.destroy();
      progressContentContainer.seamscrollInstance = null;
    }

    // Clean up jQuery selections if necessary (though less common for intervals/animations)
    // e.g., if you attached custom events with .on() that weren't cleaned
  },
};
</script>

<style scoped>
/* Include your original CSS here. */
/* Adjust asset paths like background-image urls if necessary */
/* Use @import url("@asset/dashboard/style_black_theme_ranking.css"); if supported by your build tool and you prefer not to copy-paste */

@font-face {
  font-family: 'FZQingKeBenYueSong';
  src: url('/assets/dashboard/fz.ttf') format('truetype');
}


body,
html {
  -webkit-user-select: none;
  /* 针对Chrome、Safari等浏览器 */
  -moz-user-select: none;
  /* 针对Firefox浏览器 */
  -ms-user-select: none;
  /* 针对IE、Edge浏览器 */
  user-select: none;
  /* 标准语法 */
  height: 100%;
  /* 确保整个网页大小与浏览器窗口一致 */
  margin: 0;
  padding: 0;
  /*background-image: url('bg.png');*/
  background-image: url('/assets/dashboard/cbf.webp');
  background-size: cover;
  overflow: hidden;
  /* 防止出现滚动条 */
  font-size: 1vw;
  /* 基于视口宽度的相对字体大小 */
}

.dashboard {
  position: relative;
  width: 99%;
  height: 86%;
  margin-top: 20px;
  /* 设置距离顶部30px */
  margin-left: auto;
  margin-right: auto;
  display: flex;
  gap: 0.5%;
}

.left-panel {
  width: 35%;
  display: flex;
  flex-direction: column;
  gap: 0.5%;
}

.central-panel {
  width: 12%;
  display: flex;
  flex-direction: column;
  background-color: rgba(34, 34, 34, 0.7);
  display: flex;
  gap: 0.5%;
  align-items: center;
  /* 确保内容居中显示 */
}

.central-panel .title {
  font-family: 'FZQingKeBenYueSong', sans-serif;
  color: white;
  /* 标题文字颜色设置为白色 */
  font-weight: bold;
  font-size: 1.5em;
  /* 标题文字更大 */
  padding-top: 0.5em;
  /* 保持边距 */
  text-align: center;
}

.central-panel .progress-module {
  width: 100%;
  /* 使模块填充整个父容器宽度 */
  font-size: 2vh;
  margin-top: 10px;
  position: relative;
  /* 设置相对定位，便于子元素使用绝对定位 */
}

.central-panel .name {
  color: white;
  margin-bottom: 5px;
  /* 名称与进度条容器之间的间隔 */
}

.central-panel .progress-container {
  display: flex;
  width: 100%;
  align-items: center;
  /* 对齐进度条和目标数字 */
}

.central-panel progress {
  flex-grow: 1;
  height: 15px;
  /* 进度条的高度 */
  -webkit-appearance: none;
  appearance: none;
  position: relative;
  /* 设置相对定位 */
}

.central-panel .progress-value {
  position: absolute;
  left: 50%;
  /* 水平居中 */
  top: 1;
  /* 垂直居中 */
  transform: translateX(-50%);
  /* 确保完全居中 */
  color: white;
  font-size: 14px;
  /* 根据需要调整字体大小 */
  z-index: 1;
  /* 确保文字显示在进度条之上 */
}


.central-panel .target {

  color: white;
  text-align: left;
  /* 文字向左对齐 */
  font-size: 15px;
  /* 字体大小与进度条高度一致 */
  margin-left: 5px;
  /* 在进度条和文字之间留出一点空间 */
}

.central-panel progress::-webkit-progress-bar {
  background-color: #555;
}

.central-panel progress::-webkit-progress-value {
  background-color: #f95865;
}

.central-panel progress::-moz-progress-bar {
  background-color: #f95865;
}

/* 添加一个新类用于进度条超过100% */
.central-panel .over-100::-webkit-progress-value {
  background-color: #4CAF50;
  /* 红色表示超过100% */
}

.central-panel .over-100::-moz-progress-bar {
  background-color: #4CAF50;
  /* 红色表示超过100% */
}

#progress-bulk-container {
  width: 95%;
  height: calc(100% - 2em);
  overflow-y: auto;
}


.right-panel {
  width: 56%;
  display: flex;
  flex-direction: column;
  gap: 0.5%;
}

.upper-left,
.upper-right,
.lower-right {
  background-color: rgba(34, 34, 34, 0.7);
}

.upper-left {
  flex: 65%;
}

.lower-left {
  flex: 35%;
  display: flex;
  gap: 1%;
}

.left-section,
.middle-section,
.right-section,
.xhs-section {
  background-color: rgba(34, 34, 34, 0.7);
  display: flex;
  width: 33%;
}


.upper-left .title {
  font-family: 'FZQingKeBenYueSong', sans-serif;
  color: white;
  /* 标题文字颜色设置为白色 */
  font-weight: bold;
  font-size: 1.7em;
  /* 标题文字更大 */
  padding: 1em;
  /* 保持边距 */
  padding-bottom: 0.5em;
  /* 保持边距 */
  text-align: center;
}

.performance-table,
.central-ranking-table {
  width: calc(100% - 1em);
  /* 填满模块空间，考虑到边距 */
  height: calc(85% - 15px);
  /* 纵向填满模块，减去标题和间距 */
  margin: 0 auto;
  border-collapse: collapse;
  background-color: transparent;
  /* 透明底色 */
  font-size: 1.5em;
  /* 表格内的字体更大 */
  color: white;
  /* 表格文字颜色设置为白色 */
  table-layout: fixed;
  /* 固定表格布局 */
}

.performance-table th,
.performance-table td,
.central-ranking-table th,
.central-ranking-table td {
  font-weight: bold;
  text-align: center;
  border-bottom: 1px solid #ddd;
  /* 仅横向分割线 */
  padding: 5px;
  vertical-align: middle;
  /* 垂直居中对齐 */
  white-space: nowrap;
  /* 防止内容换行 */
  overflow: hidden;
  /* 超出部分隐藏 */
  text-overflow: ellipsis;
  /* 超出部分显示省略号 */
  height: 16.67%;
}

.performance-table th,
.central-ranking-table td {
  white-space: nowrap;
  /* 表头不换行 */
}

.performance-table tr:last-child td,
.central-ranking-table tr:last-child td {

  border-bottom: none;
}

.left-section,
.middle-section,
.right-section,
.xhs-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;
  /* 文字颜色为白色 */
  padding: 1em;
}

.section-title {
  height: 40%;
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 0.5em;
  /* 标题和数字之间的间距 */
}

.section-number {
  font-size: 2em;
  font-weight: bold;

}

.footer {
  position: relative;
  width: 97%;
  height: 7%;
  margin-left: auto;
  margin-right: auto;
  display: flex;

  margin-top: 0.4%;
  margin-bottom: 0.2%;
  color: white;

}

.footer-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: left;
  text-shadow: 2px 2px 15px rgba(252, 103, 110, 0.5);
}

.dashboard-text {
  font-size: 3em;
  font-family: 'Dancing Script', cursive;
  /* 使用引入的花体字 */
}

.footer-logo img {
  height: 55%;
  margin-right: 0.5em;

}


.dashboard-text sup {
  font-size: x-small;
}

.footer-time {
  /*color: black;*/
  font-size: 2em;

}

.footer-info {

  display: flex;
  flex-direction: column;
  /* 设置为列方向布局 */
  justify-content: center;
  /* 水平居中对齐 */
  align-items: flex-end;
  /* 子项左对齐 */

}

.footer-info div {
  font-size: 1em;
  display: block;
  /* 明确设置为块级元素 */
  text-align: left;
  /* 左对齐文本 */
  margin-bottom: 0.5em;
  /* 添加间距 */
}


.footer-info img.footer-qr-code {
  width: 50px;
  /* 或您希望的尺寸 */
  height: 50px;
  /* 或您希望的尺寸 */
  margin-top: 1em;
  /* 与文本之间的间距 */
}

.upper-right {
  height: 55%;
}

.lower-right {
  height: 45%;
}

.right-table {
  height: calc(86% - 2em);
  overflow-y: auto;
}

.right-lower-table {
  height: calc(85% - 2em);
  overflow-y: auto;
}

.upper-right,
.lower-right {
  overflow: hidden;
}

.right-table::-webkit-scrollbar,
.right-lower-table::-webkit-scrollbar,
#progress-bulk-container::-webkit-scrollbar {
  display: none;
  /* 隐藏滚动条 */
}

.upper-right .title,
.lower-right .title {
  font-family: 'FZQingKeBenYueSong', sans-serif;
  color: white;
  /* 标题文字颜色设置为白色 */
  font-weight: bold;
  font-size: 1.5em;
  /* 标题文字更大 */
  padding-top: 0.5em;
  /* 保持边距 */
  text-align: center;
  margin-bottom: 0px;
}


.sublet-table,
.viewing-table {

  width: calc(100% - 1em);
  /* 填满模块空间，考虑到边距 */

  margin: 0 auto;
  border-collapse: collapse;
  background-color: transparent;
  /* 透明底色 */
  font-size: 1.3em;
  /* 表格内的字体更大 */
  color: white;
  /* 表格文字颜色设置为白色 */
  table-layout: fixed;
  /* 固定表格布局 */

}

.sublet-table th,
.sublet-table td,
.viewing-table th,
.viewing-table td {
  white-space: nowrap;
  /* 防止内容换行 */
  overflow: hidden;
  /* 超出部分隐藏 */
  text-overflow: ellipsis;
  /* 超出部分显示省略号 */
  padding-left: 10px;
  padding-top: 0.6em;
  padding-bottom: 0.6em;
  padding-right: 10px;
  border-bottom: 1px solid #ddd;
  /* 仅横向分割线 */
  text-align: center;
  /* 文本居中 */
  vertical-align: middle;
  /* 垂直居中对齐 */

}

.sublet-table th:nth-child(6),
.sublet-table td:nth-child(6) {
  width: 40%;
  /* 主观需求列宽度设置为40% */
  text-align: left;
}

.sublet-table th:nth-child(1),
.sublet-table td:nth-child(1) {
  width: 9%;
  /* 类型 */
}

.sublet-table th:nth-child(2),
.sublet-table td:nth-child(2) {
  width: 14%;
  /* 经纪人 */
}

.sublet-table th:nth-child(3),
.sublet-table td:nth-child(3) {
  width: 16%;
  /* 地点 */
}

.sublet-table th:nth-child(4),
.sublet-table td:nth-child(4) {
  width: 9%;
  /* 预算 */
}

.sublet-table th:nth-child(5),
.sublet-table td:nth-child(5) {
  width: 12%;
  /* 租期 */
}



/*.sublet-table tr:last-child td, .viewing-table tr:last-child td {*/
/*    border-bottom: none; */
/*}*/

.sublet-table th:nth-child(6),
.sublet-table td:nth-child(6) {
  width: 40%;
  /* 主观需求列宽度设置为40% */
}


.viewing-table th:nth-child(1),
.viewing-table td:nth-child(1) {
  width: 16%;
  /* 时间 */
}

.viewing-table th:nth-child(2),
.viewing-table td:nth-child(2) {
  width: 15%;
  /* 经纪人 */
}

.viewing-table th:nth-child(3),
.viewing-table td:nth-child(3) {
  width: 16%;
  /* 公寓名称 */
}

.viewing-table th:nth-child(4),
.viewing-table td:nth-child(4) {
  width: 15%;
  /* Unit */
}

.viewing-table th:nth-child(5),
.viewing-table td:nth-child(5) {
  width: 38%;
  /* 备注 */
  text-align: left;
}

.notice {
  position: relative;
  width: 100%;
  font-size: 2vh;
  line-height: 100%;
  height: 3vh;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  color: white;
  align-items: center;
  /* 垂直居中 */
  background-color: rgba(34, 34, 34, 0.7);
  overflow: hidden;
  /* 隐藏超出部分 */
  margin-top: 0.4%;
}

.scrolling-text {
  white-space: nowrap;
  /* 保持文本在一行 */
  display: flex;
  left: 100%;
  letter-spacing: 1px;
  /* 增加字间距，这里是示例值，您可以根据需要调整 */
}

.fas.fa-plane {
  transform: scaleX(-1);
}

.scrolling-text span {
  margin-left: 100px;
}

/* Loading Overlay样式 */
#loadingOverlay {
  position: fixed;
  /* 固定位置 */
  top: 0;
  left: 0;
  width: 100%;
  /* 全屏 */
  height: 100%;
  background: rgba(255, 255, 255, 0.25);
  /* 半透明背景 */
  display: flex;
  align-items: center;
  /* 垂直居中对齐 */
  justify-content: center;
  /* 水平居中对齐 */
  z-index: 1000;
  /* 确保它在页面顶层 */
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  /* 水平偏移，垂直偏移，模糊半径，颜色 */
}

/* 转圈动画 */
.loader {
  font-size: 4vh;
  color: #3498db;
  /*border-radius: 50%;*/
  /*width: 70px;*/
  /*height: 70px;*/
  animation: spin 2s linear infinite;
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

/* 文本样式 */
.loadingText {
  font-size: 4vh;
  color: #ffffff;

}

.soulC {
  text-decoration: line-through;
  text-decoration-thickness: 2px;
  /* 设置删除线的粗细 */
  font-style: italic;
}

/* Adjust logo path if needed */
.footer-logo-image {
  content: url("/assets/dashboard/logo.png");
  /* Example using ~@ syntax for webpack/vite */
  /* Or simply */
  /* content: url("@asset/dashboard/logo.png"); */
}

/* Ensure loading overlay is positioned correctly */
#loadingOverlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  /* Dark overlay */
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  /* Ensure it's on top */
  font-size: 2em;
}

.loader {
  font-size: 1.5em;
  margin-bottom: 10px;
}

.loadingText {
  font-size: 0.5em;
}

.fa-spin {
  animation: fa-spin 2s infinite linear;
}

@keyframes fa-spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}


/* Add or adjust styles if the iframe path needs specific handling or if original CSS isn't applied */
#gCal {
  /* Ensure it fills its container */
  display: block;
  /* Remove extra space below iframe */
}

/* Ensure the marquee container behaves as expected */
#wrapper {
  overflow: hidden;
  /* Crucial for horizontal scrolling */
  white-space: nowrap;
  /* Prevent text wrapping */
  position: relative;
  /* Needed if .soulC is absolutely positioned within it */
}

#marquee {
  display: inline-block;
  /* Allow horizontal layout of spans */
  /* Initial position needs to be handled by JS */
  transform: translateX(0px);
  /* Will be updated by JS */
}

#marquee span {
  display: inline-block;
  /* Ensure spans are side-by-side */
  padding-right: 50px;
  /* Space between repeating text */
}

.soulC {
  /* Style for the soulC text, adjust as needed */
  font-weight: bold;
  color: yellow;
  /* Example color */
  padding: 0 20px;
  /* Padding around the text */
  /* If you want soulC to stay fixed or positioned differently, adjust its styles */
  /* position: absolute; top: 0; left: 0; */
  /* Example */
}

/* Adjust lower-left-inner if needed */
.lower-left-inner {
  display: flex;
  /* Assuming this was intended for the sections to be side-by-side */
  justify-content: space-around;
  /* Distribute space */
  align-items: center;
  width: 100%;
  /* Take full width of parent */
}

.lower-left-inner>div {
  flex: 1;
  /* Allow sections to grow */
  text-align: center;
  /* Center text */
}
</style>