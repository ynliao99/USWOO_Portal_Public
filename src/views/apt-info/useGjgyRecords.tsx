import { ref, reactive, computed, onMounted } from "vue";
import { http } from "@/utils/http";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { fetchAreas } from "@/api/fechAreas";
export interface AptRecord {
  id: number | null;
  userAgentName: string;
  userAgentId: string;
  area: string;
  building_name: string;
  pid?: string;
  address?: string;
  concessions?: string;
  broker_fee?: string;
  broker_fee_desc?: string;
  note?: string;
  ut?: string;
  undergrad?: string;
  undergrad_desc?: string;
  intl_student?: string;
  intl_student_desc?: string;
  pet?: string;
  pet_desc?: string;
  parking?: string;
  contact?: string;
  percent?: string;
  updated_at?: string;
  current?: string;
  website?: string;
  tour_url?: string;
  tour_url_type?: string | number;
  amenities?: string;
  room_amenities?: string;
  sightmap_id?: string;
  last_edited?: string;
  created_at?: string;
  [key: string]: any;
}

interface FetchRecordsResponse {
  status: "success" | "error" | number;
  hasAdminPermission?: boolean;
  currentUserAgentId: string;
  data: AptRecord[];
  cCount?: number;
  lastRecordCount?: number;
  totalCount?: number;
  message?: string;
}

interface SaveRecordResponse {
  status: "success" | string | number; // 状态可能是 "success" 或其他错误标识
  message?: string; // 操作结果的消息提示
  [key: string]: any; // 其他可能的字段
}

// const backendFilters = reactive<Record<string, string[]>>({});

export function useGjgyRecords() {
  const records = ref<AptRecord[]>([]);
  const loading = ref(false);

  const searchTerm = ref("");
  const sortField = ref("");
  const sortOrder = ref("");

  const filters = reactive<Record<string, string[]>>({});

  const onlyMine = ref(false);
  const currentUserAgentId = ref("");
  const hasAdminPermission = ref(false);

  const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
    pageSizes: [10, 20, 40, 60]
  });

  const areas = ref<string[]>([]);

  const columns: TableColumnList = [
    {
      label: "操作",
      prop: "operation",
      slot: "operation",
      columnKey: "type",
      width: "217px"
    },
    {
      label: "更新于",
      prop: "last_edited",
      sortable: true,
      slot: "last_edited",
      columnKey: "last_edited"
    },
    {
      label: "地区",
      prop: "area",
      sortable: true,
      slot: "area",
      columnKey: "area"
    },
    {
      label: "公寓名称",
      prop: "building_name",
      columnKey: "building_name",
      slot: "building_name"
    },
    {
      label: "优惠",
      prop: "concessions",
      columnKey: "concessions",
      slot: "operaconcessionstion"
    },
    {
      label: "中介费",
      prop: "broker_fee",
      columnKey: "broker_fee",
      slot: "broker_fee"
    },
    {
      label: "杂费",
      prop: "ut",
      columnKey: "ut",
      slot: "ut"
    },
    {
      label: "本科生",
      prop: "undergrad",
      columnKey: "undergrad",
      slot: "undergrad"
    },
    {
      label: "国际生",
      prop: "intl_student",
      columnKey: "intl_student",
      slot: "intl_student"
    },
    {
      label: "宠物",
      prop: "pet",
      columnKey: "pet",
      slot: "pet"
    },
    {
      label: "备注",
      prop: "note",
      columnKey: "note",
      slot: "note"
    },
    {
      label: "地址",
      prop: "address",
      columnKey: "address",
      slot: "address"
    },
    {
      label: "更新人",
      prop: "userAgentName",
      columnKey: "userAgentName",
      slot: "userAgentName"
    }
  ];

  const filteredRecords = computed(() => {
    let data = [...records.value];

    if (searchTerm.value) {
      const term = searchTerm.value.toLowerCase();
      data = data.filter(r =>
        Object.values(r).some(
          v => typeof v === "string" && v.toLowerCase().includes(term)
        )
      );
    }
    for (const key in filters) {
      if (filters[key]?.length) {
        data = data.filter(r => {
          const cell = (r as any)[key];
          const values = filters[key];
          if (typeof cell === "string")
            return values.some(v => cell.includes(v));
          if (Array.isArray(cell)) return cell.some(v => values.includes(v));
          return false;
        });
      }
    }
    if (sortField.value) {
      data.sort((a, b) => {
        const av = (a as any)[sortField.value] || "";
        const bv = (b as any)[sortField.value] || "";
        return sortOrder.value === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      });
    }
    pagination.total = data.length;
    return data;
  });

  const paginatedRecords = computed(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredRecords.value.slice(start, start + pagination.pageSize);
  });

  function fetchRecords() {
    loading.value = true;
    http
      .request<FetchRecordsResponse>("get", "/portalapi/gjgy/", {
        params: { action: "view" }
      })
      .then(res => {
        // 1. 正常加载并展示列表
        if (res.status === "success" && Array.isArray(res.data)) {
          const sorted = [...res.data].sort((a, b) => {
            const t1 = new Date(a.last_edited ?? 0).getTime();
            const t2 = new Date(b.last_edited ?? 0).getTime();
            return t2 - t1;
          });
          records.value = sorted;
          currentUserAgentId.value = res.currentUserAgentId;
          hasAdminPermission.value = res.hasAdminPermission ?? false;
          if (res.message) {
            message(res.message, { type: "success" });
          }
        }

        const code = Number(res.status);
        // 2. status = -2：弹确认框申请临时权限
        if (code === -2) {
          ElMessageBox.confirm(res.message || "确认申请临时权限？", "提示", {
            dangerouslyUseHTMLString: true,
            confirmButtonText: "确认",
            cancelButtonText: "取消",
            type: "warning"
          })
            .then(() =>
              http.request<FetchRecordsResponse>("get", "/portalapi/gjgy/", {
                params: { action: "applyLsqx" }
              })
            )
            .then(applyRes => {
              if (applyRes.status === "success") {
                message(applyRes.message, { type: "success" });
              } else {
                message(applyRes.message, { type: "warning" });
              }
              fetchRecords();
            })
            .catch(() => {
              // 用户取消或申请失败，无后续操作
            });
        }
        // 3. 其他负数状态：仅弹“我知道了”提示
        else if (!isNaN(code) && code < 0) {
          ElMessageBox.alert(res.message || "", "信息", {
            dangerouslyUseHTMLString: true,
            confirmButtonText: "我知道了",
            type: "info"
          });
        }

        const sorted = [...res.data].sort((a, b) => {
          const t1 = new Date(a.last_edited ?? 0).getTime();
          const t2 = new Date(b.last_edited ?? 0).getTime();
          return t2 - t1;
        });
        records.value = sorted;
        currentUserAgentId.value = res.currentUserAgentId;
        hasAdminPermission.value = res.hasAdminPermission ?? false;
      })
      .catch(() => {
        message("加载数据失败", { type: "warning" });
      })
      .finally(() => {
        loading.value = false;
      });
  }

  async function saveRecord(rec: Partial<AptRecord>): Promise<boolean> {
    const action = rec.id ? "update" : "add"; // 判断是新增还是更新
    const params: any = { action };
    if (rec.id) {
      params.caseID = rec.id; // 如果是更新，则添加 caseID 参数
    }

    // 添加 loading 状态，可选，用于指示保存操作正在进行
    // loading.value = true; // 如果希望在保存时也显示加载状态

    try {
      // 发起 POST 请求保存数据，并等待响应
      // 明确指定期望的响应类型为 SaveRecordResponse
      const response = await http.request<SaveRecordResponse>(
        "post",
        "/portalapi/gjgy/",
        {
          params,
          data: rec // 将记录数据放在请求体中
        }
      );

      // 检查响应状态
      if (response && response.status === "success") {
        // 如果状态是 'success'，显示成功消息
        // 可以优先使用后端返回的 message，如果没有则显示默认成功消息
        message(response.message || "操作成功！", { type: "success" });

        // 操作成功后，调用 fetchRecords 刷新列表
        fetchRecords();
        return true; // <--- 返回 true 表示成功
      } else {
        // 如果状态不是 'success' 或 response 不存在
        // 显示警告信息，优先使用后端返回的 message，否则使用默认错误消息
        message(response?.message || "操作失败，请稍后重试", {
          duration: 5000,
          showClose: true,
          type: "warning"
        });
        // 注意：这里决定了即使保存失败也要刷新列表
        return false; // <--- 返回 false 表示失败
      }
    } catch (error) {
      // 如果请求本身失败 (例如网络问题、服务器错误500等)
      console.error("保存记录时发生错误:", error); // 在控制台记录详细错误信息
      message("网络错误，请重试", { type: "error" }); // 显示统一的网络错误提示
      // 发生异常时，通常不刷新列表，因为操作未成功，列表状态可能未改变
      // 如果有特殊需求（例如即使失败也要刷新以获取最新状态），可以在这里调用 fetchRecords()
      return false; // <--- 返回 false 表示失败
    } finally {
      // 可选：停止 loading 状态
      loading.value = false;
    }
  }

  onMounted(() => {
    fetchRecords();
    fetchAreas(areas);
  });

  return {
    records,
    loading,
    searchTerm,
    onlyMine,
    columns,
    areas,
    pagination,
    paginatedRecords,
    fetchRecords,
    saveRecord,
    currentUserAgentId,
    hasAdminPermission,
    setSearchTerm: (v: string) => {
      searchTerm.value = v;
      pagination.currentPage = 1;
    },
    setSort: (f: string, o: string) => {
      sortField.value = f;
      sortOrder.value = o;
      pagination.currentPage = 1;
    },
    toggleOnlyMine: (v: boolean) => {
      onlyMine.value = v;
      pagination.currentPage = 1;
    },
    setPage: (p: number) => {
      pagination.currentPage = p;
    },
    setPageSize: (s: number) => {
      pagination.pageSize = s;
      pagination.currentPage = 1;
    },
    setFilter: (prop: string, values: string[]) => {
      filters[prop] = values;
      pagination.currentPage = 1;
    }
  };
}
