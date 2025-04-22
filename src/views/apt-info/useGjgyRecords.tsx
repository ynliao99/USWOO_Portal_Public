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
      label: "名称",
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

  async function saveRecord(rec: Partial<AptRecord>) {
    const action = rec.id ? "update" : "add";
    const params: any = { action };
    if (rec.id) params.caseID = rec.id;
    await http.request("post", "/portalapi/co111/", { params, data: rec });
    fetchRecords();
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
