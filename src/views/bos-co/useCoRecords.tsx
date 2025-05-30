import { ref, reactive, computed, onMounted } from "vue";
import { http } from "@/utils/http";
import { message } from "@/utils/message";
import { fetchAreas } from "@/api/fechAreas";

export interface CoRecord {
  id: number | null;
  status: string;
  type: string;
  userAgentName: string;
  placeName: string;
  unit: string;
  location: string;
  area: string;
  budget: string;
  roomType: string | string[];
  term_sd: string;
  term_ed: string;
  sex: string;
  sexRequirement: string;
  identity: string;
  demand: string;
  updated_at?: string;
  userAgentId?: string;
  eventID?: string;
  period?: string;
}

// 响应体接口
interface SaveResponse {
  status: "success" | "error" | string; // 允许 'success', 'error' 或其他字符串状态
  message?: string; // message 是可选的
  [key: string]: any; // 允许其他可能的字段
}

interface FetchRecordsResponse {
  status: "success" | "error";
  currentUserId: string;
  data: CoRecord[];
  filters?: Record<string, string[]>;
  message?: string;
}

const backendFilters = reactive<Record<string, string[]>>({});

export function useCoRecords() {
  const records = ref<CoRecord[]>([]);
  let filtersArray: Record<string, string[]>;
  const loading = ref(false);

  const searchTerm = ref("");
  const sortField = ref("");
  const sortOrder = ref("");

  const filters = reactive<Record<string, string[]>>({});

  const onlyMine = ref(false);
  const currentUserAgentId = ref("");

  const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
    pageSizes: [10, 20, 40, 60]
  });

  const areas = ref<string[]>([]);

  const filterHandler = (value: any, row: any, column: any) => {
    const values = Array.isArray(value) ? value : [value];
    const property = column.property;
    const cell = (row as any)[property];

    if (typeof cell === "string") {
      return values.some(v => cell.includes(v));
    }

    if (Array.isArray(cell)) {
      return cell.some(v => values.includes(v));
    }

    return false;
  };

  const columns: TableColumnList = [
    {
      label: "操作",
      prop: "operation",
      slot: "operation",
      columnKey: "type",
      width: "150px"
    },
    {
      label: "类型",
      prop: "type",
      sortable: true,
      filters: [],
      filterMultiple: true,
      columnKey: "type",
      filterMethod: filterHandler
    },
    {
      label: "经纪人",
      prop: "userAgentName",
      sortable: true,
      filters: [],
      filterMultiple: true,
      columnKey: "userAgentName",
      filterMethod: filterHandler
    },
    {
      label: "地点",
      prop: "placeName",
      sortable: true,
      filters: [],
      filterMultiple: true,
      columnKey: "placeName",
      slot: "placeName",
      filterMethod: filterHandler
    },
    {
      label: "地区",
      prop: "area",
      sortable: true,
      filters: [],
      filterMultiple: true,
      columnKey: "area",
      filterMethod: filterHandler
    },
    { label: "价格/预算", columnKey: "budget", prop: "budget" },
    {
      label: "房型",
      prop: "roomType",
      filters: [],
      filterMultiple: true,
      columnKey: "roomType",
      slot: "roomType",
      filterMethod: filterHandler
    },
    { label: "租期/入住时段", prop: "term", columnKey: "term", slot: "term" },
    {
      label: "性别要求",
      prop: "sexRequirement",
      sortable: true,
      columnKey: "sexRequirement",
      filters: [],
      filterMultiple: true,
      filterMethod: filterHandler
    },
    { label: "主观需求", prop: "demand", columnKey: "demand", width: "400px" }
  ];

  function updateColumnFilters() {
    columns.forEach(col => {
      const key = String(col.prop);
      const values = filtersArray[key];
      if (Array.isArray(values)) {
        col.filters = values.map(v => ({ text: v, value: v }));
      }
    });
  }

  const filteredRecords = computed(() => {
    let data = [...records.value];
    if (onlyMine.value && currentUserAgentId.value) {
      data = data.filter(
        r => String(r.userAgentId) === currentUserAgentId.value
      );
    }
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
      .request<FetchRecordsResponse>("get", "/portalapi/co/", {
        params: { action: "view" }
      })
      .then(res => {
        if (res.status === "success" && Array.isArray(res.data)) {
          const sorted = [...res.data]
            .sort((a, b) => {
              const t1 = new Date(a.updated_at ?? 0).getTime();
              const t2 = new Date(b.updated_at ?? 0).getTime();
              return t2 - t1;
            })
            .map(r => ({
              ...r,
              roomType:
                typeof r.roomType === "string"
                  ? r.roomType.split(/\s*,\s*/).map(s => s.trim())
                  : r.roomType
            }));

          records.value = sorted;
          filtersArray = res.filters ?? {};
          currentUserAgentId.value = res.currentUserId;
          Object.assign(backendFilters, res.filters || {});
          updateColumnFilters();
        }
      })
      .catch(() => {
        message("加载数据失败", { type: "warning" });
      })
      .finally(() => {
        loading.value = false;
      });
  }

  async function saveRecord(rec: Partial<CoRecord>): Promise<boolean> {
    // 添加返回类型
    const action = rec.id ? "update" : "add";
    const params: any = { action };
    // 注意: 确认后端接口使用的参数名是 id 还是 caseID
    if (rec.id) params.id = rec.id;

    try {
      // 发起请求并等待响应
      const res = await http.request<SaveResponse>("post", "/portalapi/co/", {
        params,
        data: rec
      });

      // 检查响应状态
      if (res?.status === "success") {
        // --- 成功情况 ---
        message("保存成功！", { type: "success" }); // 显示成功消息
        fetchRecords(); // 成功后刷新列表
        return true; // 返回 true 表示成功
      } else {
        // --- 失败情况 (API 返回了非 'success' 状态) ---
        let errorMsg = "保存失败";
        if (res?.message) {
          // 如果有 message 字段，使用它
          errorMsg = res.message;
        } else if (res) {
          // 如果没有 message 但有响应体，尝试将整个响应体转为字符串作为信息
          // （注意：对于复杂对象可能过长，可以考虑只显示状态或其他关键信息）
          errorMsg = `保存失败: ${JSON.stringify(res)}`;
          console.error("Save failed response without message:", res); // 在控制台记录详细错误
        }
        // else: res 为空或未定义，使用默认的 "保存失败"

        message(errorMsg, { type: "error" }); // 显示最终的错误消息
        return false; // 返回 false 表示失败
      }
    } catch (error: any) {
      // --- 异常情况 (网络错误、服务器500等导致请求本身失败) ---
      console.error("Error during saveRecord request:", error); // 在控制台记录原始错误

      let networkErrorMsg = "保存请求失败";
      // 尝试从错误对象中提取更有用的信息 (例如 axios 的错误结构)
      if (error?.response?.data?.message) {
        networkErrorMsg = error.response.data.message; // 优先使用后端在错误响应体中提供的 message
      } else if (error?.message) {
        networkErrorMsg = error.message; // 其次使用错误对象自身的 message
      }
      // else: 使用默认的 "保存请求失败"

      message(networkErrorMsg, { type: "error" }); // 显示网络或请求错误消息
      return false; // 返回 false 表示失败
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
