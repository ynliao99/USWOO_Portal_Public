import { ref, reactive, computed, onMounted } from "vue";
import { http } from "@/utils/http";
import { message } from "@/utils/message";

export interface CoRecord {
  id: number;
  status: string;
  type: string;
  userAgentName: string;
  placeName: string;
  unit: string;
  location: string;
  area: string;
  budget: string;
  roomType: string;
  term_sd: string;
  term_ed: string;
  sex: string;
  sexRequirement: string;
  identity: string;
  demand: string;
  updated_at?: string;
  userAgentId?: string;
}

interface FetchRecordsResponse {
  status: "success" | "error";
  currentUserId: string;
  data: CoRecord[];
  filters?: Record<string, string[]>;
  message?: string;
}

interface FetcAreasResponse {
  areas?: string[];
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

  // 筛选方法：根据当前列属性做精确匹配 + 实时触发
  const filterHandler = (value: any, row: any, column: any) => {
    const property = column["property"];
    const match = value.includes(row[property]);
    return match;
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
      label: "房源/通勤地点",
      prop: "placeName",
      sortable: true,
      filters: [],
      filterMultiple: true,
      columnKey: "placeName",
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
    {
      label: "价格/预算",
      columnKey: "budget",
      prop: "budget"
    },
    {
      label: "房型",
      prop: "roomType",
      filters: [],
      filterMultiple: true,
      columnKey: "roomType",
      filterMethod: filterHandler
    },
    {
      label: "租期/入住时段",
      prop: "term",
      columnKey: "term",
      slot: "term"
    },
    {
      label: "性别要求",
      prop: "sexRequirement",
      sortable: true,
      columnKey: "sexRequirement",
      filters: [],
      filterMultiple: true,
      filterMethod: filterHandler
    },
    {
      label: "主观需求",
      prop: "demand",
      columnKey: "demand",
      width: "400px"
    }
  ];

  function updateColumnFilters() {
    console.log("⬇️ 开始更新列 filters...");
    console.log(filtersArray);

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
        data = data.filter(r => filters[key].includes((r as any)[key]));
      }
    }
    if (sortField.value) {
      data.sort((a, b) => {
        const av = (a as any)[sortField.value] || "";
        const bv = (b as any)[sortField.value] || "";
        if (av > bv) return sortOrder.value === "asc" ? 1 : -1;
        if (av < bv) return sortOrder.value === "asc" ? -1 : 1;
        return 0;
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
          const sorted = [...res.data].sort((a, b) => {
            const t1 = new Date(a.updated_at ?? 0).getTime();
            const t2 = new Date(b.updated_at ?? 0).getTime();
            return t2 - t1;
          });

          records.value = sorted;
          filtersArray = res.filters ?? {};
          currentUserAgentId.value = res.currentUserId;
          console.log(res.filters);
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

  async function fetchAreas() {
    try {
      const res = await http.request<FetcAreasResponse>(
        "get",
        "/portalapi/bos_public/areas.json"
      );
      if (res.areas && Array.isArray(res.areas)) {
        areas.value = res.areas;
      }
    } catch {
      message("获取区域数据异常", { type: "warning" });
    }
  }

  async function saveRecord(rec: Partial<CoRecord>) {
    const action = rec.id ? "update" : "add";
    const params: any = { action };
    if (rec.id) params.caseID = rec.id;
    await http.request("post", "/portalapi/co/", { params, data: rec });
    fetchRecords();
  }

  onMounted(() => {
    fetchRecords();
    fetchAreas();
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
      console.log(filters);
      filters[prop] = values;
      pagination.currentPage = 1;
    }
  };
}
