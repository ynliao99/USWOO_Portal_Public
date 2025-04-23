// getViewRecord.tsx
import { ref, reactive } from "vue";
import { http } from "@/utils/http";
import { message } from "@/utils/message";

export function useRecords() {
  const dataList = ref<any[]>([]);
  const loading = ref(false);
  const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
    pageSizes: [10, 20, 40, 60]
  });
  const currentUserAgentId = ref<string>("");
  const dialogVisible = ref(false);
  const dialogTitle = ref("编辑视频信息");
  const form = reactive({
    id: null,
    location: "",
    startTime: "" as string,
    endTime: "" as string,

    address: "",
    unit: "",
    customerSex: "",
    customerIdentity: "",
    customerTarget: "",
    customerNeed: "",
    note: ""
  });
  // 新增：保存 API 返回的经纪人与地点列表，用于筛选项
  const distinctAgents = ref<string[]>([]);
  const distinctLocations = ref<string[]>([]);
  // 新增：保存排序、筛选参数
  const queryParams = reactive({
    sortField: "",
    sortOrder: "",
    filters: {} as Record<string, string[]>
  });

  // 用于外部更新查询条件
  function updateQueryParams(newParams: {
    sortField: string;
    sortOrder: string;
    filters: Record<string, string[]>;
  }) {
    queryParams.sortField = newParams.sortField;
    queryParams.sortOrder = newParams.sortOrder;
    queryParams.filters = newParams.filters;
  }

  function fetchRecords() {
    loading.value = true;
    // 构造请求参数（分页 + 排序 + 筛选）
    const params: any = {
      action: "view",
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      sortField: queryParams.sortField,
      sortOrder: queryParams.sortOrder,
      // 示例：假设后端支持 filterAgent 与 filterLocation 参数，取数组第一个值（或根据需求传递全部）
      filterAgent: queryParams.filters.agentName?.[0] || "",
      filterLocation: queryParams.filters.location?.[0] || ""
    };
    http
      .request("get", "/portalapi/calendar/", { params })
      .then((res: any) => {
        if (res.status === "success" && Array.isArray(res.data)) {
          dataList.value = res.data;
          pagination.total = res.total;
          if (res.currentUserAgentId) {
            currentUserAgentId.value = res.currentUserAgentId;
          }
          // 更新 distinctAgents 与 distinctLocations（后端返回单独的列表）
          if (res.agents) {
            distinctAgents.value = res.agents;
          }
          if (res.locations) {
            distinctLocations.value = res.locations;
          }
        } else {
          console.error("数据格式错误：", res.data);
          message("响应错误。" + res.data, { type: "warning" });
          dataList.value = [];
        }
      })
      .catch((err: any) => {
        message("加载失败" + err, { type: "warning" });
        console.error("加载失败", err);
        dataList.value = [];
      })
      .finally(() => {
        loading.value = false;
      });
  }

  // 以下保持 openDialog、handleSave、handleDelete 实现不变
  function openDialog(mode: string, row: any = null) {
    
      dialogTitle.value = "编辑看房";
      form.id = row.id;
      form.location = row.location || "";
      form.startTime = row.startTime;
      form.endTime = row.endTime;
      form.address = row.address || "";
      form.unit = row.unit || "";
      form.customerSex = row.customerSex || "";
      form.customerIdentity = row.customerIdentity || "";
      form.customerTarget = row.customerTarget || "";
      form.customerNeed = row.customerNeed || "";
      form.note = row.note || "";
    
    dialogVisible.value = true;
  }

  function handleSave() {
    const action = form.id ? "edit" : "add";
    http
      .request("post", `/portalapi/calendar/?action=${action}`, {
        data: { ...form }
      })
      .then((res: any) => {
        if (res.status === "success") {
          dialogVisible.value = false;
          fetchRecords();
          message(`${action === "add" ? "添加" : "保存"}成功`, {
            type: "success"
          });
        } else {
          console.error("保存失败：", res.message);
          message(res.message, { type: "warning" });
        }
      })
      .catch((err: any) => {
        console.error("保存异常：", err);
        message("请求异常", { type: "warning" });
      });
  }

  function handleDelete(row: any) {
    http
      .request("post", `/portalapi/calendar/?action=delete`, {
        data: { id: row.id }
      })
      .then((res: any) => {
        if (res.status === "success") {
          fetchRecords();
          message("删除成功", { type: "success" });
        } else {
          console.error("删除失败：", res.message);
          message(res.message, { type: "warning" });
        }
      })
      .catch((err: any) => {
        console.error("删除异常：", err);
        message("请求异常", { type: "warning" });
      });
  }

  const columns = [
  {
    label: "操作",
    prop: "operation",
    slot: "operation",
    width: "150px"
  },
  {
    label: "公寓",
    prop: "location",
    sortable: true
  },
  {
    label: "房型",
    prop: "agentName",
    sortable: true
  },
  {
    label: "Unit",
    prop: "startTime",
    sortable: true
  },
  { label: "地区", prop: "address" },
  { label: "下载", prop: "unit" },
  {
    label: "原大小",
    prop: "customerInfo",
    slot: "customerInfo"
  },
  { label: "状态", prop: "note" },
  { label: "上传用户", prop: "note" },
  { label: "存储源", prop: "note" }
  ];
  
  return {
    dataList,
    loading,
    pagination,
    currentUserAgentId,
    dialogVisible,
    dialogTitle,
    form,
    fetchRecords,
    openDialog,
    handleSave,
    handleDelete,
    distinctAgents,
    columns,
    distinctLocations,
    updateQueryParams
  };
}
