// getViewRecord.tsx
import { ref, reactive, computed } from "vue";
import { http } from "@/utils/http";
import { message } from "@/utils/message";
import { fetchAreas } from "@/api/fechAreas";
import {
  loadTargetSources,
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
    dialogTitle.value = "编辑视频信息";
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
     { label: "上传时间", prop: "timestamp", columnKey: "timestamp" },
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

export function usePermissionManagement() {
  // 对话框显隐与标题
  const permissionDialogVisible = ref(false);
  const permissionDialogTitle = ref('');
  // 区分 personal/team
  const permissionType = ref<'personal' | 'team'>('personal');
  const currentSource = ref('');

  // 用户列表及加载状态
  const whiteListNameList = ref<Array<{ hid: string; userAgentName: string }>>([]);
  const blackListNameList = ref<Array<{ hid: string; userAgentName: string }>>([]);
  const permissionLoading = ref(false);
  const searchQuery = ref('');

  // 表单数据
  const permissionForm = reactive({
    whiteList: [] as string[],
    blackList: [] as string[],
  });

  // 白名单搜索结果
  const filteredWhiteListNameList = computed(() => {
    if (!searchQuery.value) return whiteListNameList.value;
    return whiteListNameList.value.filter(u =>
      u.userAgentName.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  });
  // 黑名单搜索结果
  const filteredBlackListNameList = computed(() => {
    if (!searchQuery.value) return blackListNameList.value;
    return blackListNameList.value.filter(u =>
      u.userAgentName.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  });

  // 搜索回调
  function handleRemoteSearch(query: string) {
    searchQuery.value = query;
  }

  // 加载名单并预设
  async function loadUserList() {
    permissionLoading.value = true;
    try {
      const res: any = await http.request('get', '/portalapi/upload/', {
        params: { action: 'getNameList', inquiry_source: currentSource.value }
      });
      if (res.success) {
        
        whiteListNameList.value = res.whiteListNameList || [];
        
        permissionForm.whiteList = res.white_list || [];
        if (permissionType.value === 'team') {
          permissionForm.blackList = res.black_list || [];
          blackListNameList.value = res.blackListNameList || [];
          // 从白名单列表中过滤掉属于黑名单的项
          const blackHids = new Set(blackListNameList.value.map(b => b.hid));
          whiteListNameList.value = whiteListNameList.value.filter(u => !blackHids.has(u.hid));
        }
        
      } else {
        message(`获取名单失败：${res.message}`, { type: "warning" });
      }
    } catch {
      message('请求失败，请稍后重试', { type: "warning" });
    } finally {
      permissionLoading.value = false;
    }
  }

  // 打开对话框
  function openPermissionDialog(source: string) {
    currentSource.value = source;
    if (source.endsWith('personal')) {
      permissionType.value = 'personal';
      permissionDialogTitle.value = '编辑我的个人盘权限';
    } else {
      permissionType.value = 'team';
      permissionDialogTitle.value = '编辑我的团队盘权限';
    }
    permissionForm.whiteList = [];
    permissionForm.blackList = [];
    searchQuery.value = '';
    loadUserList();
    permissionDialogVisible.value = true;
  }

  // 保存权限
  async function savePermission() {
    try {
      const payload: any = {
        target_source: currentSource.value,
        white_list: permissionForm.whiteList
      };
      if (permissionType.value === 'team') {
        payload.black_list = permissionForm.blackList;
      }
      const res: any = await http.request('post', '/portalapi/upload/?action=savePermission', {
        data: payload
      });
      if (res.success) {
        message('保存成功', { type: "success" });
        permissionDialogVisible.value = false;
      } else {
        message(`失败：${res.message}`, { type: "warning" });
      }
    } catch {
      message('请求失败，请稍后重试', { type: "warning" });
    }
  }

  return {
    permissionDialogVisible,
    permissionDialogTitle,
    permissionType,
    permissionForm,
    permissionLoading,
    filteredBlackListNameList,
    filteredWhiteListNameList,
    handleRemoteSearch,
    openPermissionDialog,
    savePermission,
  };
}
