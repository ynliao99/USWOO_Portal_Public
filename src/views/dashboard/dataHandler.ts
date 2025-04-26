import { ref, computed, onMounted, onUnmounted, readonly } from "vue";
import { message } from "@/utils/message";
import { http } from "@/utils/http";
// --- Define Segment Type (Matches Recommended API Structure) ---
interface NoticeSegment {
  type: "text" | "icon" | "styledText"; // Define possible segment types
  content?: string; // Optional: Holds text content for 'text' and 'styledText'
  name?: string; // Optional: Holds icon name for 'icon' (e.g., 'plane')
  style?: string; // Optional: Holds style class name for 'styledText' (e.g., 'soulC')
}

// --- Interfaces for Type Safety ---
interface PerformanceItem {
  userAgentName: string;
  rentAmountPendingClose: string | number;
  rentDealsPendingClose: string | number;
  showingCount: string | number;
  videoCount?: string | number;
}

interface SummaryData {
  medianRentAmountPendingClose: string | number;
  totalRentDealsPendingClose: string | number;
  averageRentPerDeal: string | number;
  averageUSMarket: string | number;
}

interface GoalItem {
  userAgentName: string;
  percentage: number;
  goal: string | number;
}

interface CoOpItem {
  type: string;
  agent: string;
  location: string;
  budget: string | number;
  period: string;
  demand: string;
  status: string;
}

// --- UPDATED ApiData Interface ---
interface ApiData {
  // VVV CHANGE HERE: notice is now an array of segments VVV
  notice: NoticeSegment[];
  top_sales_data: PerformanceItem[]; //近一个月
  summary: SummaryData; //近一个月
  thismonthtop_sales_data: PerformanceItem[]; //本月
  thismonthsummary: SummaryData; //本月
  thisquartertop_sales_data: PerformanceItem[]; //本季度
  thisquartersummary: SummaryData; //本季度
  formattedCoValues: CoOpItem[]; //转租等
  thisquartergoalsummary: GoalItem[]; //季度目标
  // soulC?: string[]; // REMOVED: Handled within notice array now
}

// --- Constants ---
// Removed API_ROOT constant as fetch URL is hardcoded below
const DATA_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const RANKING_SWITCH_INTERVAL = 15 * 1000; // 15 seconds
const MAX_RETRIES = 3;

/**
 * Formats a number or string representation of a number with commas as thousands separators,
 * adds a '$' prefix, and shows 0 decimal places.
 * Handles potential non-numeric inputs gracefully.
 * @param value The value to format (string, number, null, or undefined)
 * @returns Formatted string with commas and '$', or 'N/A' if input is not a valid number.
 */
export function formatNumberWithCommas(
  value: string | number | null | undefined
): string {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "N/A"
  ) {
    return "N/A";
  }
  const num = Number(value);
  if (isNaN(num)) {
    return "N/A";
  }
  // Keep user's formatting: $ prefix, commas, 0 decimals
  return (
    "$" +
    num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  );
}

// --- Reactive State and Logic (Composable Function) ---
export function useDashboardData() {
  const loading = ref<boolean>(true);
  const error = ref<string | null>(null);
  // globalData ref now uses the updated ApiData interface
  const globalData = ref<ApiData | null>(null);
  const lastUpdatedTime = ref<Date | null>(null);
  const currentTime = ref<string>(getCurrentDateTime());
  const periodSwitch = ref<number>(1); // 1: 本月, 2: 近一个月, 3: 本季度
  let retryCount = 0;
  // lastUpdatedText is a ref, updated by interval (correct)
  const lastUpdatedText = ref<string>("");

  // --- Computed Properties for Template Binding ---

  // REMOVED: noticeContent computed property (frontend parsing no longer needed)
  // const noticeContent = computed(() => globalData.value?.notice || '');

  // ADDED: Simple computed to directly access the structured notice segments
  const noticeSegments = computed(
    (): NoticeSegment[] => globalData.value?.notice || []
  );

  const rankingTitle = computed(() => {
    switch (periodSwitch.value) {
      case 1:
        return "个人业绩排名-本月";
      case 2:
        return "个人业绩排名：近一个月";
      case 3:
        return "个人业绩排名-本季度";
      default:
        return "个人业绩排名";
    }
  });

  const dataPeriodText = computed(() => {
    switch (periodSwitch.value) {
      case 1:
        return "数据范围：本月";
      case 2:
        return "数据范围：近一个月";
      case 3:
        return "数据范围：本季度";
      default:
        return "数据范围：";
    }
  });

  const performanceData = computed<PerformanceItem[]>(() => {
    if (!globalData.value) return [];
    switch (periodSwitch.value) {
      case 1:
        return globalData.value.thismonthtop_sales_data || [];
      case 2:
        return globalData.value.top_sales_data || [];
      case 3:
        return globalData.value.thisquartertop_sales_data || [];
      default:
        return [];
    }
  });

  const summary = computed<SummaryData>(() => {
    const defaultSummary: SummaryData = {
      medianRentAmountPendingClose: "N/A",
      totalRentDealsPendingClose: "N/A",
      averageRentPerDeal: "N/A",
      averageUSMarket: "N/A"
    };
    if (!globalData.value) return defaultSummary;
    switch (periodSwitch.value) {
      case 1:
        return globalData.value.thismonthsummary || defaultSummary;
      case 2:
        return globalData.value.summary || defaultSummary;
      case 3:
        return globalData.value.thisquartersummary || defaultSummary;
      default:
        return defaultSummary;
    }
  });

  const quarterlyGoals = computed<GoalItem[]>(
    () => globalData.value?.thisquartergoalsummary || []
  );

  const coOpData = computed<CoOpItem[]>(() => {
    return (
      globalData.value?.formattedCoValues?.filter(
        item => item.status === "Open"
      ) || []
    );
  });

  // --- Utility Functions ---
  function getCurrentDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // Function to update the "time ago" text (correctly updates the ref)
  function updateLastUpdatedTextDisplay() {
    if (!lastUpdatedTime.value) {
      lastUpdatedText.value = "尚未更新";
      return;
    }
    const now = new Date();
    if (
      lastUpdatedTime.value instanceof Date &&
      !isNaN(lastUpdatedTime.value.getTime())
    ) {
      const diff = now.getTime() - lastUpdatedTime.value.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      lastUpdatedText.value = `${minutes}分${seconds}秒前更新`;
    } else {
      lastUpdatedText.value = "更新时间无效";
    }
  }

  // UPDATED isDataInvalid check
  function isDataInvalid(
    data: any
  ): data is null | undefined | Partial<ApiData> {
    return (
      !data ||
      // VVV CHANGE HERE: Check if notice is an array VVV
      !Array.isArray(data.notice) ||
      !data.top_sales_data ||
      !data.summary ||
      !data.thismonthtop_sales_data ||
      !data.thismonthsummary ||
      !data.thisquartertop_sales_data ||
      !data.thisquartersummary ||
      !data.formattedCoValues ||
      !data.thisquartergoalsummary
    );
  }

  // --- Data Fetching ---
  async function fetchData(): Promise<ApiData> {
    try {
      // Use http.get for the request.
      // The generic <ApiData> tells the client what data structure to expect.
      // Assuming the http client wrapper returns the data directly.
      // If it returns the full Axios response, use `const response = await http.get...`
      // and then `const data = response.data;`
      const data = await http.get<ApiData, unknown>(
        "portalapi/dashboard/new_portal_data.php"
        // Add any request config if needed, e.g., { params: { ... } }
      );

      // If the request succeeds (no error thrown), show success message
      message("刷新成功", { type: "success" });

      // Validate the structure of the received data
      if (isDataInvalid(data)) {
        // Use a more specific warning message
        message("API响应错误：数据结构不匹配", { type: "warning" });
        console.warn("Received invalid data structure:", data);
        // Throw an error to be caught by the calling function (loadData)
        throw new Error("Invalid data structure received from API.");
      }

      // Data is valid and correctly typed, return it
      return data;
    } catch (error: any) {
      // Catch errors from http.get (network, non-2xx status) or the validation above
      console.error("Error fetching dashboard data:", error);

      // Try to get status code from Axios-like error structure
      const status = error?.response?.status;
      let errorMessage = error?.message || "获取数据时发生未知错误"; // Default message

      if (status) {
        errorMessage = `请求失败！状态码: ${status}`;
      } else if (error.message === "Network Error") {
        errorMessage = "网络错误，请检查连接";
      }
      // Add more specific error handling if needed based on 'error' object

      // Show error message to the user
      message(errorMessage, { type: "error" });

      // Re-throw the error so loadData's catch block can handle retries etc.
      // It's often better to re-throw the original error object
      throw error;
      // Alternatively, throw a new error with just the message:
      // throw new Error(errorMessage);
    }
  }

  async function loadData() {
    loading.value = true;
    error.value = null;
    try {
      const data = await fetchData();
      globalData.value = data;
      lastUpdatedTime.value = new Date();
      retryCount = 0;
    } catch (err: any) {
      console.error("Error loading data:", err);
      error.value = err.message || "Failed to load data";
      retryCount++;
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying data load (${retryCount}/${MAX_RETRIES})...`);
        setTimeout(loadData, 3000);
        return;
      } else {
        console.error("Max retry limit reached. Stopping attempts.");
      }
    } finally {
      if (retryCount === 0 || retryCount >= MAX_RETRIES) {
        loading.value = false;
      }
    }
  }

  // --- Timers ---
  let clockIntervalId: number | null = null;
  let refreshIntervalId: number | null = null;
  let rankingIntervalId: number | null = null;
  let lastUpdatedIntervalId: number | null = null; // Interval ID for "last updated" text

  function startTimers() {
    stopTimers(); // Clear existing timers

    clockIntervalId = window.setInterval(() => {
      currentTime.value = getCurrentDateTime();
    }, 1000);
    refreshIntervalId = window.setInterval(loadData, DATA_REFRESH_INTERVAL);
    rankingIntervalId = window.setInterval(() => {
      periodSwitch.value = (periodSwitch.value % 3) + 1;
    }, RANKING_SWITCH_INTERVAL);
    // Interval to update "last updated" text (correct)
    lastUpdatedIntervalId = window.setInterval(
      updateLastUpdatedTextDisplay,
      1000
    );
  }

  function stopTimers() {
    if (clockIntervalId) clearInterval(clockIntervalId);
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    if (rankingIntervalId) clearInterval(rankingIntervalId);
    // Clear the "last updated" interval (correct)
    if (lastUpdatedIntervalId) clearInterval(lastUpdatedIntervalId);
    clockIntervalId = null;
    refreshIntervalId = null;
    rankingIntervalId = null;
    lastUpdatedIntervalId = null; // Reset ID
  }

  // --- Lifecycle Hooks ---
  onMounted(() => {
    loadData();
    startTimers();
  });

  onUnmounted(() => {
    stopTimers();
  });

  // --- Return reactive state and methods ---
  // UPDATED return statement
  return {
    loading: readonly(loading),
    error: readonly(error),
    currentTime: readonly(currentTime),
    lastUpdatedText: readonly(lastUpdatedText), // Keep returning this ref
    noticeSegments: readonly(noticeSegments), // <<< RETURN structured segments
    rankingTitle,
    dataPeriodText,
    performanceData,
    summary,
    quarterlyGoals,
    coOpData
    // loadData // Expose if manual refresh needed
  };
}
