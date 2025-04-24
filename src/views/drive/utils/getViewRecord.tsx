// getViewRecord.tsx
import { ref, reactive } from "vue";
import { http } from "@/utils/http";
import { message } from "@/utils/message";
import { fetchAreas } from "@/api/fechAreas";
import {
  loadTargetSources,
  loadPublicTargetSources,
  SelectOption,
  loadWhiteListTargetSources
} from "@/api/drivePathList";
// 顶部：引入 CancelTokenSource
import axios, { CancelTokenSource } from 'axios';

// 顶部：声明一个全局取消源
let fetchCancelSource: CancelTokenSource | null = null;

export async function useSourceOptions() {
  const sourceOptions = ref<SelectOption[]>([]);
  const privateSources = ref<SelectOption[]>([]);
  const publicSources = ref<SelectOption[]>([]);
  const whiteListSources = ref<SelectOption[]>([]);
  try {
    // 私人/团队/公共/白名单盘
    
    await loadTargetSources(privateSources);
    sourceOptions.value = [...publicSources.value, ...privateSources.value];
    await loadWhiteListTargetSources(whiteListSources);
    sourceOptions.value = [
  ...publicSources.value,
  ...privateSources.value,
  ...whiteListSources.value
];

  } catch (err: any) {
    message(err.message || "加载选项失败", { type: "error" });
  }
  return {
    sourceOptions
  };
}

export function useRecords() {
  const areas = ref<string[]>([]);
  fetchAreas(areas);
  const dataList = ref<any[]>([]);
  const loading = ref(false);
  const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
    pageSizes: [10, 15, 20, 50, 100]
  });
  const currentUserAgentId = ref<string>("");
  const download_link_prefix = ref<string>("");
  const share_link_prefix = ref<string>("");
  const dialogVisible = ref(false);
  const dialogTitle = ref("编辑视频信息");
  const form = reactive({
    vid: null,
    apartmentName: "",
    address: "",
    unit: "",
    area: ""
  });

  // 新增：保存排序、筛选参数
  const queryParams = reactive({
    sortField: "",
    sortOrder: "",
    source: "",
    search: "",
    filters: {} as Record<string, string[]>
  });

 

 // 切换存储源后更新参数并重新拉取
  function handleChangeSource(val: string) {
  // “self” 表示“我上传的”，后端以空串表示
  queryParams.source = val === 'self' ? '' : val;
  fetchRecords();
}

function fetchRecords() {
  // 先 cancel 掉上一次的请求（如果有的话）
  if (fetchCancelSource) {
    fetchCancelSource.cancel('取消上一次 fetchRecords 请求');
  }
  fetchCancelSource = axios.CancelToken.source();

  loading.value = true;
  const params: any = {
    page: pagination.currentPage,
    per_page: pagination.pageSize,
    source: queryParams.source,
    search: queryParams.search
  };

  http
    .request('get', '/portalapi/upload/', {
      params,
      cancelToken: fetchCancelSource.token
    })
    .then((res: any) => {
        if (res.status === "success" && Array.isArray(res.data.content)) {
          dataList.value = res.data.content;
          pagination.total = res.data.totalCount;

          if (res.data.currentUserId) {
            currentUserAgentId.value = res.data.currentUserId;
            console.log("当前用户ID:", currentUserAgentId.value);
          }

          if (res.data.download_link_prefix) {
            download_link_prefix.value = res.data.download_link_prefix;
            console.log("下载链接前缀:", download_link_prefix.value);
          }

          if (res.data.share_link_prefix) {
            share_link_prefix.value = res.data.share_link_prefix;
            console.log("分享链接前缀:", share_link_prefix.value);
          }
        } else {
          console.error("数据格式错误：", res.data);
          message("响应错误。" + res.data, { type: "warning" });
          dataList.value = [];
        }
      })
    .catch(err => {
      if (!axios.isCancel(err)) {
        message('加载失败' + err, { type: 'warning' });
        dataList.value = [];
      }
    })
    .finally(() => {
      loading.value = false;
    });
}

  // 以下保持 openDialog、handleSave、handleDelete 实现不变
  function openDialog(mode: string, row: any = null) {
    dialogTitle.value = "编辑看房";
    form.vid = row.vid;
    form.area = row.area || "";
    form.address = row.address || "";
    form.unit = row.unit || "";
    form.apartmentName = row.apartmentName || "";

    dialogVisible.value = true;
  }
  
// 分页切换时重新加载数据
function handleSizeChange(val: number) {
  pagination.pageSize = val;
  pagination.currentPage = 1;
  fetchRecords();
}

function handleCurrentChange(val: number) {
  pagination.currentPage = val;
  fetchRecords();
}

// handleSearch 只更新参数并调用 fetchRecords
function handleSearch(val: string) {
  queryParams.search = val;
  pagination.currentPage = 1; // 可选：搜新关键字回第一页
  fetchRecords();
}

  function handleSave() {
    const action = "edit";
    http
      .request("post", `/portalapi/upload1/?action=${action}`, {
        data: { ...form }
      })
      .then((res: any) => {
        if (res.status === "success") {
          dialogVisible.value = false;
          fetchRecords();
          message(`保存成功`, {
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
      .request("post", `/portalapi/upload1/?action=delete`, {
        data: { id: row.vid }
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
      prop: "apartmentName",
      columnKey: "apartmentName"
    },
    {
      label: "房型",
      prop: "roomType",
      columnKey: "roomType"
    },
    {
      label: "Unit",
      prop: "unit",
      columnKey: "unit"
    },
    { label: "地区", columnKey: "area", prop: "area" },
    {
      label: "下载",
      prop: "download",
      slot: "download",
      columnKey: "download",
      width: "110px"
    },
    {
      label: "原大小",
      prop: "filesize",
      slot: "filesize",
      columnKey: "filesize"
    },
    { label: "状态", prop: "status", columnKey: "status" },
    { label: "上传用户", prop: "userName", columnKey: "userName" },
    {
      label: "存储源",
      prop: "target_source_label",
      columnKey: "target_source_label"
    }
  ];

  return {
    dataList,
    loading,
    pagination,
    currentUserAgentId,
    dialogVisible,
    dialogTitle,
    form,
    handleSizeChange,
    handleCurrentChange,
    handleSearch,
    fetchRecords,
    openDialog,
    handleChangeSource,
    handleSave,
    handleDelete,
    columns,
    areas,
    download_link_prefix,
    share_link_prefix
  };
}
