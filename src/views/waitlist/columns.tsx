import type {
  LoadingConfig,
  AdaptiveConfig,
  PaginationProps
} from "@pureadmin/table";
import { ref, onMounted, reactive } from "vue";
import { http } from "@/utils/http";

// 定义返回数据类型
export type WaitlistResult = {
  status: string;
  data: any[];  // 根据实际数据类型进行调整
  total: number;
};

export function useColumns() {
  const dataList = ref<any[]>([]);
  const loading = ref(true);

  // 筛选方法：根据当前列属性做精确匹配
  const filterHandler = (value: any, row: any, column: any) => {
    const property = column["property"];
    return row[property] === value;
  };

  // 定义表格列配置
  const columns: TableColumnList = [
    {
      label: "更新时间",
      prop: "updated_at" // 对应数据库字段
    },
    {
      label: "经纪人",
      prop: "userAgentName",
      filters: [],               // 筛选项将动态生成
      filterMethod: filterHandler
    },
    {
      label: "房源",
      prop: "apartment",
      filters: [],               // 筛选项将动态生成
      filterMethod: filterHandler
    },
    {
      label: "房型",
      prop: "roomType"
    },
    {
      label: "Floor Plan",
      prop: "floorplan"
    },
    {
      label: "入住日期",
      prop: "moveIn"
    },
    {
      label: "Waitlist状态",
      prop: "html",
      slot: "html",
      align: "left",
      className: "no-wrap",
      minWidth: "300px"
    }
  ];

  // 分页配置
  const pagination = reactive<PaginationProps>({
    pageSize: 10,
    currentPage: 1,
    pageSizes: [10, 20, 40, 60],
    total: 0,
    align: "right",
    background: true,
    size: "default"
  });

  // 加载配置
  const loadingConfig = reactive<LoadingConfig>({
    text: "正在加载第一页...",
    viewBox: "-10, -10, 50, 50",
    spinner: `
      <path class="path" d="
        M 30 15
        L 28 17
        M 25.61 25.61
        A 15 15, 0, 0, 1, 15 30
        A 15 15, 0, 1, 1, 27.99 7.5
        L 15 15
      " style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)"/>
    `
  });

  // 自适应配置
  const adaptiveConfig: AdaptiveConfig = {
    offsetBottom: 110
  };

  // 根据加载的数据动态生成“经纪人”和“房源”列的筛选项
  function updateFilters() {
    const agentNameSet = new Set<string>();
    const apartmentSet = new Set<string>();

    dataList.value.forEach(item => {
      if (item.userAgentName) {
        agentNameSet.add(item.userAgentName);
      }
      if (item.apartment) {
        apartmentSet.add(item.apartment);
      }
    });

    const agentFilters = Array.from(agentNameSet).map(name => ({
      text: name,
      value: name
    }));

    const apartmentFilters = Array.from(apartmentSet).map(apartment => ({
      text: apartment,
      value: apartment
    }));

    // 更新 columns 中对应列的 filters 字段
    columns.forEach(col => {
      if (col.prop === "userAgentName") {
        col.filters = agentFilters;
      }
      if (col.prop === "apartment") {
        col.filters = apartmentFilters;
      }
    });
  }

  // 获取数据并更新筛选项
  function fetchData() {
    loadingConfig.text = `正在加载第${pagination.currentPage}页...`;
    loading.value = true;

    http
      .request<WaitlistResult>(
        "get",
        "/portalapi/waitlist/",
        {
          params: {
            action: "view",
            page: pagination.currentPage,
            pageSize: pagination.pageSize
          }
        }
      )
      .then(res => {
        if (res.status === "success" && Array.isArray(res.data)) {
          dataList.value = res.data;
          pagination.total = res.total;
          updateFilters();
        } else {
          console.error("数据格式错误：", res.data);
          dataList.value = [];
        }
      })
      .catch(err => {
        console.error("加载失败", err);
        dataList.value = [];
      })
      .finally(() => {
        loading.value = false;
      });
  }

  function onSizeChange(val: number) {
    pagination.pageSize = val;
    pagination.currentPage = 1;
    fetchData();
  }

  function onCurrentChange(val: number) {
    pagination.currentPage = val;
    fetchData();
  }

  onMounted(() => {
    fetchData();
  });

  return {
    loading,
    columns,
    dataList,
    pagination,
    loadingConfig,
    adaptiveConfig,
    onSizeChange,
    onCurrentChange
  };
}
