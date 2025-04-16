// src/views/welcome/WelcomeApiHandler.ts
import { ref, onMounted } from "vue";
import { http } from "@/utils/http";
import Bell from "~icons/ri/bell-line";
import Money from "~icons/ri/money-dollar-circle-line";
import Building from "~icons/ri/building-line";
import Video from "~icons/ri/video-upload-line";
import dayjs from "dayjs";

// 定义返回数据类型（请根据实际接口数据结构进行调整）
export type DashboardResult = {
  status: string;
  data: any; // 接口返回的 data 是一个对象
};

/**
 * 导出一个函数用于获取仪表盘相关的数据，并组装 chartData、monthlyPerformance、
 * quarterlyPerformance、progressData、latestNewsData 以及 coTableData 数据。
 */
export function getDashboardData() {
  const dataList = ref<any>({});
  const chartData = ref<any[]>([]);
  const monthlyPerformance = ref<any[]>([]);
  const quarterlyPerformance = ref<any[]>([]);
  const thirtyDaysPerformance = ref<any[]>([]);
  const progressData = ref<any[]>([]);
  const latestNewsData = ref<any[]>([]);
  const coTableData = ref<any[]>([]); // 合作房源数据

  const loading = ref(true);
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  function assembleData(dashboardData: any): void {
    const gjgyRe = 12 - (dashboardData.gjgyCount || 0);
    const gjgyPercent =
      dashboardData.gjgyCount == 0 ? 0 : (dashboardData.gjgyCount / 12 * 100).toFixed(0);
    const uploadRe = 4 - (dashboardData.uploadCount || 0);
    const uploadPercent =
      dashboardData.uploadCount == 0 ? 0 : (dashboardData.uploadCount / 4 * 100).toFixed(0);
    const formattedlastReDtDealDate =
      dashboardData.lastDealInf && dashboardData.lastDealInf.lastReDtDeal
        ? dayjs(dashboardData.lastDealInf.lastReDtDeal).format("MM/DD/YY")
        : "";

    chartData.value = [
      {
        icon: Money,
        bgColor: "#effaff",
        color: "#41b6ff",
        duration: 1500,
        name: "季度业绩",
        value: dashboardData.goalCurrent,
        percent:
          (dashboardData.goalCurrent / dashboardData.goalValue * 100)
            .toFixed(2) + "%",
        data: [2101, 5288, 4239, 4962, 6752, 5208, 7450]
      },
      {
        icon: Bell,
        bgColor: "#fff5f4",
        color: "#e85f33",
        duration: 3000,
        name: "未开单天数",
        value: dashboardData.lastDealInf && dashboardData.lastDealInf.lastReDtDealPassed,
        percent: formattedlastReDtDealDate,
        data: [2216, 1148, 1255, 788, 4821, 1973, 4379]
      },
      {
        icon: Video,
        bgColor: "#eff8f4",
        color: "#26ce83",
        duration: 100,
        name: "本月视频上传",
        value: dashboardData.uploadCount,
        percent: uploadRe <= 0 ? "多多益善" : "还需" + uploadRe + "个",
        data: [uploadPercent]
      },
      {
        icon: Building,
        bgColor: "#f6f4fe",
        color: "#7846e5",
        duration: 100,
        name: "本月高级公寓",
        value: dashboardData.gjgyCount,
        percent: gjgyRe <= 0 ? "多多益善" : "还需" + gjgyRe + "个",
        data: [gjgyPercent]
      }
    ];

    // 组装 thirtyDaysPerformance
    const topSales: any[] = dashboardData.top_sales_data || [];
    const combinedMap = new Map<string, { name: string; amount: number }>();
    topSales.forEach(item => {
      const name = item.userAgentName;
      const amount = Number(item.rentAmountPendingClose) || 0;
      if (combinedMap.has(name)) {
        combinedMap.get(name)!.amount += amount;
      } else {
        combinedMap.set(name, { name, amount });
      }
    });
    thirtyDaysPerformance.value = Array.from(combinedMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(item => ({
        name: item.name,
        amount: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD"
        }).format(item.amount)
      }));

    // quarterlyPerformance：仅使用 thisquartertop_sales_data
    const quarterSales: any[] = dashboardData.thisquartertop_sales_data || [];
    const quarterlyMap = new Map<string, { name: string; amount: number }>();
    quarterSales.forEach(item => {
      const name = item.userAgentName;
      const amount = Number(item.rentAmountPendingClose) || 0;
      if (quarterlyMap.has(name)) {
        quarterlyMap.get(name)!.amount += amount;
      } else {
        quarterlyMap.set(name, { name, amount });
      }
    });
    quarterlyPerformance.value = Array.from(quarterlyMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(item => ({
        name: item.name,
        amount: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD"
        }).format(item.amount)
      }));

    // monthlyPerformance：仅使用 thismonthtop_sales_data
    const thismonthtop_sales_data: any[] = dashboardData.thismonthtop_sales_data || [];
    const thismonthMap = new Map<string, { name: string; amount: number }>();
    thismonthtop_sales_data.forEach(item => {
      const name = item.userAgentName;
      const amount = Number(item.rentAmountPendingClose) || 0;
      if (thismonthMap.has(name)) {
        thismonthMap.get(name)!.amount += amount;
      } else {
        thismonthMap.set(name, { name, amount });
      }
    });
    monthlyPerformance.value = Array.from(thismonthMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(item => ({
        name: item.name,
        amount: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD"
        }).format(item.amount)
      }));

    // progressData：来自 thisquartergoalsummary
    const quarterGoal: any[] = dashboardData.thisquartergoalsummary || [];
    let mappedProgress = quarterGoal.map(item => ({
      name: item.userAgentName,
      target: item.goal, // 使用接口中的 goal 值
      percentage: Number(item.percentage) || 0,
      duration: 0,
      color: (Number(item.percentage) > 80) ? "#26ce83" : "#41b6ff"
    }));
    mappedProgress.sort((a, b) => b.percentage - a.percentage);
    const indexMy = mappedProgress.findIndex(item => item.name === "我");
    if (indexMy >= 0) {
      const [myItem] = mappedProgress.splice(indexMy, 1);
      mappedProgress.unshift(myItem);
    }
    mappedProgress = mappedProgress.map((item, index) => ({
      ...item,
      duration: (item.percentage / 100) * 10
    }));
    progressData.value = mappedProgress;

    // latestNewsData：来自 upcomingEvents
    const upcomingEvents: any[] = dashboardData.upcomingEvents || [];
    latestNewsData.value = upcomingEvents.map(item => {
      const currentYear = dayjs().year();
      const d = dayjs(`${currentYear}-${item.time}`, "YYYY-MM/DD HH:mm");
      const formattedDate = d.isValid()
        ? d.format("MM/DD HH:mm") + " " + days[d.day()]
        : item.time;
      const parts = [];
      if (item.agentName) parts.push(item.agentName);
      if (item.apartment) parts.push(item.apartment);
      if (item.unit && item.unit.trim() !== "") parts.push(item.unit);
      return {
        ...item,
        date: formattedDate,
        message: parts.join(" - ")
      };
    });

    // coTableData：直接使用 dashboardData.formattedCoValues
    coTableData.value = dashboardData.formattedCoValues || [];
  }

  function fetchData() {
    loading.value = true;
    http
      .request<DashboardResult>("get", "/portalapi/dashboard/", {
        params: { action: "view" }
      })
      .then(res => {
        if (
          res.status === "success" &&
          res.data &&
          typeof res.data === "object"
        ) {
          dataList.value = res.data;
          assembleData(res.data);
        } else {
          console.error("数据格式错误：", res.data);
          dataList.value = {};
          chartData.value = [];
          monthlyPerformance.value = [];
          quarterlyPerformance.value = [];
          progressData.value = [];
          latestNewsData.value = [];
          coTableData.value = [];
          thirtyDaysPerformance.value = [];
        }
      })
      .catch(err => {
        console.error("加载失败", err);
        dataList.value = {};
        chartData.value = [];
        monthlyPerformance.value = [];
        quarterlyPerformance.value = [];
        progressData.value = [];
        latestNewsData.value = [];
        coTableData.value = [];
        thirtyDaysPerformance.value = [];
      })
      .finally(() => {
        loading.value = false;
      });
  }

  onMounted(() => {
    fetchData();
  });

  return {
    loading,
    dataList,
    chartData,
    monthlyPerformance,
    quarterlyPerformance,
    progressData,
    latestNewsData,
    coTableData,
    thirtyDaysPerformance
  };
}
