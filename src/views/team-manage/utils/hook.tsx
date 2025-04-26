import { ref, reactive, onMounted, computed, h } from "vue";
import { message } from "@/utils/message"; // Assuming PureAdmin's message utility
import type { PaginationProps } from "@pureadmin/table";
// import { ElMessageBox } from "element-plus"; // Keep if needed for confirmations
import { http } from "@/utils/http"; // Import the project's pre-configured http client

// --- Interfaces ---

// Structure of a single team member from the API
interface TeamMember {
  userAgentId: string;
  userAgentName: string;
  ruzhi: string;
  showingCount: number | null;
  current: number | null;
  goal: number | null;
  gjgy: {
    is_q: number;
    lastRecordCount: number | null;
    thisRecordCount: number | null;
  } | null;
  video: {
    is_q: number;
    lastVideoCount: number | null;
    thisVideoCount: number | null;
  } | null;
  work_status: number;
  work_status_label: string;
  team_leader: string | null;
  user_access_type: number | null;
  role: string;
}

// Structure for summary statistics display
interface SummaryStats {
  teamMemberCountText: string;
  dqCountText: string;
  qtCurrentText: string;
}

// Expected response structure for fetching team data
interface FetchTeamDataResponse {
  status: string;
  team_of: string;
  data: TeamMember[];
  message?: string;
}

// Expected response structure for the update operation
interface UpdateSuccessResponse {
  status: string;
  message?: string;
}

// --- Composable Function ---

export function useTeamManagement() {
  // --- State ---
  const loading = ref(true);
  const dataList = ref<TeamMember[]>([]);
  const teamName = ref(""); // Name of the current team leader/admin viewer
  const searchQuery = ref(""); // Search input model

  // Pagination
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 15,
    currentPage: 1,
    background: true
  });

  // --- Computed Properties ---

  // Summary statistics calculated from dataList
  const summaryStats = computed<SummaryStats>(() => {
    const stats = {
      count1: 0,
      count2: 0,
      count3: 0,
      count4: 0,
      dqCountGJGY: 0,
      dqCountVideo: 0,
      qtTotal: 0
    };
    const activeMembers = dataList.value.filter(row => row.work_status !== 5);

    activeMembers.forEach(row => {
      switch (row.work_status) {
        case 1:
          stats.count1++;
          break;
        case 2:
          stats.count2++;
          break;
        case 3:
          stats.count3++;
          break;
        case 4:
          stats.count4++;
          break;
      }
      if (row.role !== "admin") {
        if (row.gjgy?.is_q === 0) stats.dqCountGJGY++;
        if (row.video?.is_q === 0) stats.dqCountVideo++;
      }
      stats.qtTotal += row.current ?? 0;
    });

    const totalActive =
      stats.count1 + stats.count2 + stats.count3 + stats.count4;
    return {
      teamMemberCountText: `${stats.count1}/${stats.count2}/${stats.count3}/${stats.count4}/${totalActive}`,
      dqCountText: `${stats.dqCountVideo}/${stats.dqCountGJGY}`,
      qtCurrentText: Number(stats.qtTotal).toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
      })
    };
  });

  // Client-side filtered data based on search query
  const filteredData = computed(() => {
    const query = searchQuery.value.toLowerCase().trim();
    if (!query) {
      pagination.total = dataList.value.length;
      return dataList.value;
    }
    const result = dataList.value.filter(row => {
      const fieldsToSearch = [
        row.userAgentName,
        row.team_leader,
        row.work_status_label
      ];
      return fieldsToSearch.some(
        field => field && String(field).toLowerCase().includes(query)
      );
    });
    pagination.total = result.length;
    return result;
  });

  // Paginated data slice based on filtered data and pagination settings
  const paginatedData = computed(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredData.value.slice(start, end);
  });

  // --- API Functions ---

  // Fetch team data using the project's http client
  const fetchTeamData = async () => {
    loading.value = true;
    const apiUrl = "/portalapi/admin/?action=view"; // GET endpoint

    try {
      // Use http.request for GET
      const response = await http.request<FetchTeamDataResponse>("get", apiUrl);

      // Check response status (assuming http wrapper returns data directly)
      if (response && response.status === "success") {
        dataList.value = response.data || [];
        teamName.value = response.team_of || "";
        pagination.total = dataList.value.length; // Initialize total count based on fetched data
        // Ensure pagination reflects the total unfiltered count initially
        pagination.currentPage = 1; // Reset to first page on refresh
      } else {
        console.error("Error fetching team data:", response?.message);
        message(`加载团队数据失败: ${response?.message || "未知错误"}`, {
          type: "error"
        });
        dataList.value = [];
        teamName.value = "";
        pagination.total = 0;
      }
    } catch (error) {
      console.error("Failed to fetch team data:", error);
      // Error message might be handled by interceptors, provide fallback
      message(`加载团队数据失败: ${error.message || "请联系管理员"}`, {
        type: "error"
      });
      dataList.value = [];
      teamName.value = "";
      pagination.total = 0;
    } finally {
      loading.value = false;
    }
  };

  // Update user access type using the project's http client
  const handleUpdateUserAccess = async (
    userAgentId: string,
    allow: boolean
  ) => {
    const accessType = allow ? 1 : 2;
    const apiUrl = "/portalapi/admin/"; // POST endpoint

    const postData = new URLSearchParams();
    postData.append("userId", userAgentId);
    postData.append("accessType", String(accessType));

    message("正在更新...", { type: "info", duration: 1500 }); // Loading indicator

    try {
      // Use http.request for POST
      const response = await http.request<UpdateSuccessResponse>(
        "post",
        apiUrl,
        {
          data: postData,
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        }
      );

      // Check response status
      if (response && response.status === "success") {
        message("更新成功！", { type: "success" });
        fetchTeamData(); // Refresh data list
      } else {
        throw new Error(response?.message || "更新操作未在服务器端成功完成");
      }
    } catch (error) {
      console.error("Failed to update user access type:", error);
      // Provide fallback error message
      message(`更新失败: ${error.message || "请联系管理员"}`, {
        type: "error"
      });
    }
  };

  // --- Event Handlers ---

  const onSearch = () => {
    pagination.currentPage = 1; // Reset to first page on new search
  };

  const handleSizeChange = (val: number) => {
    pagination.pageSize = val;
    pagination.currentPage = 1;
  };

  const handleCurrentChange = (val: number) => {
    pagination.currentPage = val;
  };

  // --- Table Columns Definition (Using h function) ---

  const columns = reactive<any[]>([
    {
      label: "姓名",
      prop: "userAgentName",
      minWidth: 100,
      cellRenderer: ({ row }) =>
        h(
          "span",
          {
            style:
              row.work_status === 5
                ? { color: "gray", fontStyle: "italic" }
                : {}
          },
          row.userAgentName || "-"
        )
    },
    {
      label: "入职时间",
      prop: "ruzhi",
      minWidth: 110,
      cellRenderer: ({ row }) =>
        h(
          "span",
          {
            style:
              row.work_status === 5
                ? { color: "gray", fontStyle: "italic" }
                : {}
          },
          row.ruzhi ? new Date(row.ruzhi).toLocaleDateString() : "-"
        )
    },
    {
      label: "本季度看房次数",
      prop: "showingCount",
      minWidth: 90,
      align: "center",
      cellRenderer: ({ row }) =>
        h(
          "span",
          {
            style:
              row.work_status === 5
                ? { color: "gray", fontStyle: "italic" }
                : {}
          },
          row.showingCount ?? "-"
        )
    },
    {
      label: "季度业绩",
      prop: "current",
      minWidth: 130,
      align: "right",
      cellRenderer: ({ row }) => {
        const style =
          row.work_status === 5 ? { color: "gray", fontStyle: "italic" } : {};
        const text =
          row.current !== null && row.current !== undefined
            ? Number(row.current).toLocaleString("en-US", {
                style: "currency",
                currency: "USD"
              })
            : row.work_status !== 5
              ? "无数据"
              : "-";
        return h("span", { style }, text);
      }
    },
    {
      label: "政策更新 (上月/本月)",
      prop: "gjgy",
      minWidth: 130,
      align: "center", // Shortened label
      cellRenderer: ({ row }) => {
        if (row.work_status === 5)
          return h(
            "span",
            { style: { color: "gray", fontStyle: "italic" } },
            "-"
          );
        if (!row.gjgy) return h("span", null, "-");
        const lastCount = row.gjgy.lastRecordCount ?? "-";
        const thisCount = row.gjgy.thisRecordCount ?? "-";
        const thisColor =
          (row.gjgy.thisRecordCount ?? 0) < 12 ? "red" : "green";
        return h("span", null, [
          `${lastCount} / `,
          h("span", { style: { color: thisColor } }, thisCount)
        ]);
      }
    },
    {
      label: "视频上传 (上月/本月)",
      prop: "video",
      minWidth: 130,
      align: "center", // Shortened label
      cellRenderer: ({ row }) => {
        if (row.work_status === 5)
          return h(
            "span",
            { style: { color: "gray", fontStyle: "italic" } },
            "-"
          );
        if (!row.video) return h("span", null, "-");
        const lastCount = row.video.lastVideoCount ?? "-";
        const thisCount = row.video.thisVideoCount ?? "-";
        const thisColor = (row.video.thisVideoCount ?? 0) < 4 ? "red" : "green";
        return h("span", null, [
          `${lastCount} / `,
          h("span", { style: { color: thisColor } }, thisCount)
        ]);
      }
    },
    {
      label: "工作状态",
      prop: "work_status_label",
      minWidth: 90,
      cellRenderer: ({ row }) =>
        h(
          "span",
          {
            style:
              row.work_status === 5
                ? { color: "gray", fontStyle: "italic" }
                : {}
          },
          row.work_status_label || "-"
        )
    },
    {
      label: "直属上级",
      prop: "team_leader",
      minWidth: 100,
      cellRenderer: ({ row }) =>
        h(
          "span",
          {
            style:
              row.work_status === 5
                ? { color: "gray", fontStyle: "italic" }
                : {}
          },
          row.team_leader || "-"
        )
    },
    // {
    //   label: "按全职管理", prop: "user_access_type", minWidth: 100, // Shortened label
    //   cellRenderer: ({ row }) => {
    //     let text = "默认", color = '', isMyTeamMember = (row.userAgentName === teamName.value || (row.team_leader === teamName.value && row.role !== 'admin' && row.work_status !== 5));
    //     if (row.work_status === 5) { text = "已离职"; color = 'gray'; }
    //     else if (row.user_access_type === null) { text = "未指定"; if (isMyTeamMember) color = 'red'; }
    //     else if (row.user_access_type === 1) { text = "是"; }
    //     else if (row.user_access_type === 2) { text = "否"; }
    //     const style = { color: color || undefined, fontStyle: row.work_status === 5 ? 'italic' : 'normal' };
    //     return h('span', { style }, text);
    //   }
    // },
    { label: "是否按全职管理", fixed: "right", width: 180, slot: "operation" }
  ]);

  // Row styling for resigned members
  const rowStyle = ({ row }) =>
    row.work_status === 5 ? { color: "gray", fontStyle: "italic" } : null;

  // --- Lifecycle Hook ---
  onMounted(() => {
    fetchTeamData();
  });

  // --- Return values ---
  return {
    loading,
    teamName,
    summaryStats,
    searchQuery,
    paginatedData, // Use paginatedData for the table
    columns,
    pagination,
    rowStyle,
    onSearch,
    handleSizeChange,
    handleCurrentChange,
    handleUpdateUserAccess,
    fetchTeamData
  };
}
