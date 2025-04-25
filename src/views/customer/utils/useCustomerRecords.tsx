import { ref, reactive, computed, onMounted, watch } from "vue";
import { http } from "@/utils/http";
import { message } from "@/utils/message";

import type { ElForm, FormInstance,  AutocompleteFetchSuggestionsCallback } from "element-plus";
import { ElMessageBox } from "element-plus";

// --- Interfaces ---

// Building Info for Autocomplete
export interface BuildingInfo {
  id: string;
  label: string; // for autocomplete display (name)
  value: string; // for autocomplete value (name)
  name: string;
  address: string;
  area?: string;
  city?: string;
  state?: string;
  postcode?: string;
}

// Structure for uploaded file info (as received from backend)
export interface UploadedFileInfo {
  file_name: string;
  path: string | null; // Assuming path is present for downloadable files
}

// Customer Record (Data received from backend and displayed)
export interface CustomerRecord {
  id: number; // Assuming ID is present, though legacy used UUID mainly
  uuid: string; // Unique identifier used in legacy links/actions
  userAgentId: string; // ID of the agent responsible
  userAgentName?: string; // Name of the agent (assuming backend provides this)
  community_name?: string; // Building Name
  buildingId?: string; // Building ID
  address?: string;
  unit?: string;
  rent?: string;
  concession?: string;
  broker_fee?: string; // Customer Broker Fee
  ll_broker_fee?: string; // Landlord Broker Fee
  term?: string; // Lease term in months
  move_in_date?: string; // YYYY-MM-DD
  move_out_date?: string; // YYYY-MM-DD
  waitlist?: string; // Waitlist info
  title?: string; // Not in legacy form, but maybe useful
  last_name?: string;
  first_name?: string;
  email?: string;
  uploaded_files?: string | UploadedFileInfo[];
  created_at: string; // Timestamp YYYY-MM-DD HH:MM:SS
  updated_at?: string; // Timestamp YYYY-MM-DD HH:MM:SS
  file_only?: number | boolean; // 0 or 1 / false or true
  is_completed?: number; // Status: 0: Not Started, 1: In Progress, 2: Completed, 4: Voided
  // Computed field, not from backend directly
  fullName?: string;
}

// Data structure for Creating/Updating a record
export interface CreateOrUpdateCustomerRecord {
  id?: number | null; // Include ID for updates
  userAgentId?: string; // Automatically set for new records? Backend should handle.
  community_name: string;
  buildingId: string;
  address: string;
  unit: string;
  rent: string;
  concession?: string;
  broker_fee?: string;
  ll_broker_fee?: string;
  term?: string;
  move_in_date?: string; // YYYY-MM-DD
  move_out_date?: string; // YYYY-MM-DD
  waitlist?: string;
  last_name: string;
  first_name: string;
  email: string;
  // Send selected file names as an array of strings
  uploaded_files?: string | null;
  file_only?: boolean;
}

// API Response structure
interface FetchCustomerRecordsResponse {
  status: "success" | "error";
  currentUserId: string; // Matches userAgentId
  currentUserName?: string; // Optional: If backend provides current user's name
  data: CustomerRecord[];
  message?: string;
  // filtersArray?: Record<string, string[]>; // From original code, re-evaluate if needed
}

// Building List API Response structure
interface FetchBuildingListResponse {
    status: "success" | "error";
    data: {
        content: BuildingInfo[];
        status: number;
    };
    message?: string;
}



// List of files that can be requested
export const availableFiles = [
    "Passport", "Visa", "I20", "DS2019", "Offer",
    "Pay_Stub", "Bank_Statement", "Financial_Document", "Other"
];

// Status mapping
export const statusMap: Record<number, string> = {
  0: '未开始',
  1: '填写中',
  2: '已完成',
  4: '已作废'
};
export const statusList = Object.entries(statusMap).map(([value, text]) => ({ value: parseInt(value), text }));


// --- Hook Logic ---

export function useCustomerRecords() {
  const records = ref<CustomerRecord[]>([]);
  const loading = ref(false);
  const buildings = ref<BuildingInfo[]>([]); // Store building list

  // --- State for Filters, Sort, Search ---
  const searchTerm = ref("");
  const sortField = ref("created_at"); // Default sort
  const sortOrder = ref("desc"); // Default sort order
  const statusFilter = ref<number[]>([]); // For the filter dialog
  const onlyMine = ref(false);
  const currentUserAgentId = ref(""); // Current user's agent ID
  const currentUserName = ref(""); // Current user's name (optional)

  // --- Pagination ---
  const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
    pageSizes: [10, 20, 40, 60]
  });

  // --- Columns Definition ---
  const columns: TableColumnList = [
    {
      label: "操作",
      prop: "operation",
      slot: "operation",
      fixed: "left",
      width: 154 // Increased width for more buttons
    },
    {
      label: "客户链接",
      prop: "uuid",
      slot: "clientLink",
      width: 100
    },
    {
      label: "负责人",
      prop: "created_by", // Assuming backend provides this based on userAgentId
      minWidth: 100
    },
    {
      label: "发起时间",
      prop: "created_at",
      sortable: true,

      formatter: (row) => formatDate(row.created_at) // Format date
    },
    {
      label: "客户姓名",
      prop: "fullName", // Use computed fullName

    },
    {
      label: "公寓名称",
      prop: "community_name",

    },
    {
      label: "Unit",
      prop: "unit",

    },
    {
      label: "Move-in",
      prop: "move_in_date",
      sortable: "custom",
      formatter: (row) => formatDate(row.move_in_date) // Format date
    },
    {
      label: "客户中介费", // Changed label to be specific
      prop: "broker_fee",

    },
    {
      label: "文件",
      prop: "uploaded_files",
      slot: "files",
      minWidth: 200,

    },
    {
      label: "状态",
      prop: "is_completed",
      slot: "status",

      // --- Element Plus Table Column Filter ---
      // Example if using built-in filters instead of separate dialog
      // columnKey: "is_completed",
      // filters: statusList.map(s => ({ text: s.text, value: s.value })),
      // filterMethod: (value: number, row: CustomerRecord) => {
      //   // Adjust logic if needed (e.g., 'Completed' includes others)
      //   return row.is_completed === value;
      // }
    }
  ];

  // --- Data Fetching ---
  function fetchRecords() {
    loading.value = true;
    http
      .request<FetchCustomerRecordsResponse>("get", "/portalapi/crm/", { // Adjust endpoint if needed
        params: { action: "view" }
      })
      .then(res => {
        if (res.status === "success" && Array.isArray(res.data)) {
          // Process data: Add fullName, parse uploaded_files
          const processedData = res.data.map(r => ({
            ...r,
            fullName: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
            // Parse uploaded_files if it's a JSON string
            uploaded_files: typeof r.uploaded_files === 'string'
                            ? parseJsonSafe<UploadedFileInfo[]>(r.uploaded_files, [])
                            : r.uploaded_files || [],
            // Ensure file_only is boolean for consistency
             file_only: !!r.file_only
          }));

          records.value = processedData; // Keep original order or sort as needed
          currentUserAgentId.value = res.currentUserId;
          currentUserName.value = res.currentUserName || '';
          // Initial sort is handled by computed property if sortField/Order are set
          // updateColumnFilters(); // Update if using column filters
        } else {
           records.value = []; // Clear data on error
           message(res.message || "加载数据失败", { type: "warning" });
        }
      })
      .catch((err) => {
        console.error("Fetch Records Error:", err);
        message("加载数据失败，请检查网络或联系管理员", { type: "error" });
        records.value = []; // Clear data on catch
      })
      .finally(() => {
        loading.value = false;
      });
  }

  // Fetch building list for autocomplete
  async function fetchBuildings() {
    try {
        const res = await http.request<FetchBuildingListResponse>("get", "/portalapi/portal_support/get_building_list.php");
        if (res.status === 'success' && res.data.status === 200 && Array.isArray(res.data?.content)) {
            buildings.value = res.data.content.map(b => ({
                ...b,
                value: b.name, // for autocomplete display
                label: b.name  // for autocomplete display
            }));
        } else {
            message(res.message || "加载公寓列表失败", { type: "warning" });
        }
    } catch (err) {
        console.error("Fetch Buildings Error:", err);
        message("加载公寓列表失败", { type: "error" });
    }
}

  // --- Save/Update Record ---
async function saveRecord(recordData: CreateOrUpdateCustomerRecord) {
    const action = recordData.id ? "update" : "add";
    loading.value = true;

    // Payload already contains the JSON string in recordData.uploaded_files
    const payload = {
        ...recordData,
        // Ensure it's a valid string or default to empty array string
        uploaded_files: recordData.uploaded_files || '[]',
        file_only: !!recordData.file_only
    };

    // Prepare parameters (action, id/uuid) - same as before
    const params: any = { action };
    if (action === 'update') {
      if ((payload as any).uuid) params.uuid = (payload as any).uuid;
      else if (payload.id) params.caseID = payload.id;
    }

    try {
      // Make the API request - payload.uploaded_files is already the JSON string
       const response = await http.request<{ status: string; message?: string }>("post", "/portalapi/crm1/", { // Adjust endpoint
           params: params,
           data: payload // Send the payload directly
       });

       // Handle response... (same as before)
       if (response.status === 'success' || response.status === 'successNoEmail') {
            message(response.message || "保存成功！", { type: response.status === 'success' ? "success" : "warning" });
            fetchRecords();
            return true;
        } else {
            message(response.message || "保存失败，请重试。", { type: "error" });
            return false;
        }
    } catch (error: any) {
        // Handle error... (same as before)
         console.error("Save Record Error:", error);
        const errorMsg = error?.response?.data?.message || error.message || "保存请求失败";
        message(errorMsg, { type: "error" });
        return false;
    } finally {
        loading.value = false;
    }
}

  // --- Void Record ---
   async function voidRecord(uuid: string) {
       try {
            await ElMessageBox.confirm(
                "确定要作废此条记录吗？此操作不可撤销！",
                "确认作废",
                { type: 'warning' }
            );

            // Proceed if confirmed
            loading.value = true;
            // Adjust endpoint and params as needed, matching legacy `applictaion_process.php?action=void&type=4&uuid=`
            const response = await http.request<{ status: string; message?: string }>("post", "/portalapi/crm1/", { // Assuming same endpoint handles void
                params: {
                    action: 'void',
                    type: 4, // Legacy type for voiding
                    uuid: uuid
                }
                // No data needed usually for void
            });

            if (response.status === 'success') {
                message("记录已作废！", { type: "success" });
                fetchRecords(); // Refresh data
            } else {
                message(response.message || "作废失败，请重试。", { type: "error" });
            }

       } catch (error) {
           // Catch potential errors from http request or if user cancels confirm dialog
           if (error === 'cancel') {
                // User cancelled the confirmation
                message("操作已取消", { type: "info" });
           } else {
               console.error("Void Record Error:", error);
               message("作废请求失败", { type: "error" });
           }
       } finally {
            loading.value = false;
       }
   }

  // --- Computed Properties for Filtering/Sorting/Pagination ---
  const filteredAndSortedRecords = computed(() => {
    let data = [...records.value];

    // 1. Filter by "Only Mine"
    if (onlyMine.value && currentUserAgentId.value) {
      data = data.filter(
        r => String(r.userAgentId) === currentUserAgentId.value
      );
    }

    // 2. Filter by Status (from filter dialog)
    if (statusFilter.value.length > 0) {
        // Legacy logic: If 'Completed (2)' is selected, include 2 AND any other non-(0, 1, 4) status?
        // Current simpler logic: exact match
        const filterSet = new Set(statusFilter.value);
        data = data.filter(r => r.is_completed !== undefined && filterSet.has(r.is_completed));

    }


    // 3. Filter by Search Term
    if (searchTerm.value) {
      const term = searchTerm.value.toLowerCase();
      // Search specific relevant fields (adjust as needed)
      const searchFields: (keyof CustomerRecord)[] = [
          'fullName', 'community_name', 'address', 'unit', 'email', 'broker_fee', 'll_broker_fee', 'move_in_date', 'userAgentName'
      ];
      data = data.filter(r =>
        searchFields.some(field =>
          r[field] && typeof r[field] === "string" && r[field]!.toLowerCase().includes(term)
        ) || (r.first_name && r.first_name.toLowerCase().includes(term)) // Explicitly check first/last name if fullName isn't enough
         || (r.last_name && r.last_name.toLowerCase().includes(term))
      );
    }

    // 4. Sort
    if (sortField.value) {
      data.sort((a, b) => {
        const field = sortField.value as keyof CustomerRecord;
        let valA = a[field];
        let valB = b[field];

        // Handle different types for sorting
        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        } else if (field === 'created_at' || field === 'updated_at' || field === 'move_in_date' || field === 'move_out_date') {
             // Date comparison
             const dateA = (typeof valA === 'string' || typeof valA === 'number' || valA instanceof Date) 
                 ? new Date(valA).getTime() 
                 : 0;
             const dateB = (typeof valB === 'string' || typeof valB === 'number' || valB instanceof Date) 
                 ? new Date(valB).getTime() 
                 : 0;
             comparison = dateA - dateB;
        }
        else {
            // Default to string comparison (case-insensitive)
             const strA = String(valA || '').toLowerCase();
             const strB = String(valB || '').toLowerCase();
             comparison = strA.localeCompare(strB);
        }

        return sortOrder.value === "asc" ? comparison : -comparison;
      });
    }

    // Update total count for pagination *after* filtering
    pagination.total = data.length;

    return data;
  });

  // 5. Paginate
  const paginatedRecords = computed(() => {
    // Ensure currentPage is valid after filtering might reduce total pages
    const maxPage = Math.ceil(pagination.total / pagination.pageSize);
    if (pagination.currentPage > maxPage && maxPage > 0) {
        pagination.currentPage = maxPage;
    } else if (pagination.currentPage < 1) {
         pagination.currentPage = 1;
    }

    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredAndSortedRecords.value.slice(start, end);
  });


  // --- State Update Functions ---
  function setSearchTerm(value: string) {
    searchTerm.value = value;
    pagination.currentPage = 1; // Reset to first page on search
  }

  function setSort(field: string, order: "asc" | "desc" | "") {
    sortField.value = field;
    sortOrder.value = order || 'asc'; // Default to asc if order is empty
    pagination.currentPage = 1; // Reset to first page on sort
  }

   function setStatusFilter(statuses: number[]) {
     statusFilter.value = statuses;
     pagination.currentPage = 1; // Reset to first page on filter change
   }

  function toggleOnlyMine(value: boolean) {
    onlyMine.value = value;
    pagination.currentPage = 1; // Reset to first page on toggle
  }

  function setPage(page: number) {
    pagination.currentPage = page;
  }

  function setPageSize(size: number) {
    pagination.pageSize = size;
    pagination.currentPage = 1; // Reset to first page on size change
  }

  // --- Lifecycle Hook ---
  onMounted(() => {
    fetchRecords();
    fetchBuildings(); // Fetch buildings on mount
  });

  // --- Helper Functions ---
  function formatDate(dateStr: string | undefined | null): string {
      if (!dateStr) return '';
      try {
          // Handle potential full timestamp or just date
          const date = new Date(dateStr.includes(' ') ? dateStr : dateStr + 'T00:00:00');
          if (isNaN(date.getTime())) return dateStr; // Return original if invalid

          // Format as MM/DD/YYYY (matching legacy format slightly better)
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = date.getFullYear();
          return `${month}/${day}/${year}`;
      } catch (e) {
          return dateStr; // Return original on error
      }
  }

  // Safe JSON parsing helper
    function parseJsonSafe<T>(jsonString: string | undefined | null, defaultValue: T): T {
        if (!jsonString) return defaultValue;
        try {
            return JSON.parse(jsonString) as T;
        } catch (e) {
            console.error("Failed to parse JSON:", e, jsonString);
            return defaultValue;
        }
    }


  // --- Returned Values ---
  return {
    // State
    records, // Original fetched records (processed)
    loading,
    buildings, // Building list for autocomplete
    pagination,
    searchTerm,
    onlyMine,
    currentUserAgentId,
    currentUserName,
    statusFilter, // Current status filter array
    sortField,
    sortOrder,

    // Computed
    paginatedRecords, // Data ready for the table
    filteredAndSortedRecords, // Data after filter/sort but before pagination

    // Data & Config
    columns,
    availableFiles, // List of file checkboxes
    statusMap, // For displaying status text
    statusList, // For filter options

    // Methods
    fetchRecords,
    fetchBuildings, // Expose if needed elsewhere
    saveRecord,
    voidRecord, // Expose void function
    setSearchTerm,
    setSort,
    setStatusFilter, // Expose function to set status filter
    toggleOnlyMine,
    setPage,
    setPageSize,
    formatDate // Expose if needed in template directly
  };
}