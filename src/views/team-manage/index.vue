<script setup lang="ts">
import { ref } from "vue";
import { useTeamManagement } from "./utils/hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

// Import Icons using the explicit import syntax
import Search from "~icons/ep/search";
import AccountMultipleIcon from "~icons/mdi/account-multiple?width=38&height=38";
import AlertIcon from "~icons/mdi/alert?width=38&height=38";
import FinanceIcon from "~icons/mdi/finance?width=38&height=38";
// Note: Refresh icon is usually handled by PureTableBar's refresh button/event

defineOptions({
  name: "TeamManagement" // Unique component name
});

const formRef = ref();
const {
  loading,
  teamName,
  summaryStats,
  searchQuery,
  paginatedData,
  columns,
  pagination,
  rowStyle,
  onSearch,
  handleSizeChange,
  handleCurrentChange,
  handleUpdateUserAccess,
  handleSpecifyAccess,
  fetchTeamData
} = useTeamManagement();

// Helper to determine if the switch should be enabled/visible
const canManageUser = row => {
  // Cannot manage resigned users OR users who are not direct reports (or self if leader)
  return (
    row.work_status !== 5 &&
    (row.userAgentName === teamName.value ||
      (row.team_leader === teamName.value && row.role !== "admin"))
  );
};

// --- Switch Computed Value ---
// Helper to compute the switch state (true for Full-Time [1], false otherwise [null, 0, 2])
const isFullTimeManaged = row => {
  return row.user_access_type === 1;
};

// --- Switch Change Handler ---
// This function is called by the @change event of the switch
const onSwitchChange = (newState: boolean, row) => {
  // newState will be true if switched ON (Full-Time), false if switched OFF (Non-Full-Time)
  // We directly call the update function from the hook
  handleUpdateUserAccess(row.userAgentId, newState);
};
</script>

<template>
  <div class="main p-4">
    <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="card-header">
          <span>{{ teamName || "加载中..." }} 团队详情</span>
        </div>
      </template>
      <el-row :gutter="12" class="mb-4">
        <el-col :xs="24" :sm="24" :md="8">
          <el-card shadow="hover" class="h-full">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-sm mb-1">
                  团队人数 (全/兼/实/培/总)
                </p>
                <p class="text-xl font-semibold">
                  {{ summaryStats.teamMemberCountText || "加载中..." }}
                </p>
              </div>
              <AccountMultipleIcon class="text-green-500 flex-shrink-0 ml-2" />
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8">
          <el-card shadow="hover" class="h-full">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-sm mb-1">视频/公寓上月未达标</p>
                <p class="text-xl font-semibold">
                  {{ summaryStats.dqCountText || "加载中..." }}
                </p>
              </div>
              <AlertIcon class="text-red-500 flex-shrink-0 ml-2" />
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8">
          <el-card shadow="hover" class="h-full">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-sm mb-1">团队季度业绩</p>
                <p class="text-xl font-semibold">
                  {{ summaryStats.qtCurrentText || "加载中..." }}
                </p>
              </div>
              <FinanceIcon class="text-blue-500 flex-shrink-0 ml-2" />
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-form
        ref="formRef"
        :inline="true"
        class="search-form bg-bg_color w-full pt-1"
        @submit.prevent="onSearch"
      >
        <el-form-item prop="search">
          <el-input
            v-model="searchQuery"
            placeholder="搜索姓名、上级或状态..."
            clearable
            class="!w-[250px]"
            :disabled="loading"
            @input="onSearch"
            @clear="onSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :icon="useRenderIcon(Search)"
            :loading="loading"
            @click="onSearch"
          >
            搜索
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-alert
      title="关于“按全职管理”状态切换"
      type="info"
      show-icon
      :closable="true"
      class="mb-4 text-sm"
    >
      <p><b>全职:</b> 该成员按全职管理，需完成月度任务，影响全组权限。</p>
      <p><b>非全职:</b> 该成员按非全职管理，不计入任务考核，不影响他人。</p>
      <p>
        <b>注意:</b>
        必须为你的直属活跃成员指定管理方式。开关状态会实时更新后台数据。
      </p>
    </el-alert>

    <PureTableBar
      title="团队成员列表"
      :columns="columns"
      @refresh="fetchTeamData"
    >
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          border
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          align-whole="center"
          showOverflowTooltip
          table-layout="auto"
          :loading="loading"
          :size="size"
          :data="paginatedData"
          :columns="dynamicColumns"
          :pagination="pagination"
          :row-style="rowStyle"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #operation="{ row }">
            <div v-if="canManageUser(row)">
              <el-switch
                v-if="row.user_access_type !== null"
                :model-value="isFullTimeManaged(row)"
                :loading="loading"
                :disabled="loading"
                inline-prompt
                active-text="全职"
                inactive-text="非全职"
                :active-value="true"
                :inactive-value="false"
                :size="size === 'small' ? 'small' : 'default'"
                style="

                  --el-switch-on-color: var(--el-color-primary);
                  --el-switch-off-color: var(--el-color-info);
                "
                @change="newState => onSwitchChange(newState as boolean, row)"
              />
              <el-tooltip
                v-else
                content="状态未指定，请点击选择"
                placement="top"
              >
                <el-button
                  type="warning"
                  link
                  :size="size"
                  @click="handleSpecifyAccess(row)"
                  >未指定</el-button
                >
              </el-tooltip>
            </div>
            <span v-else class="text-gray-400"> - </span>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
.search-form {
  :deep(.el-form-item) {
    margin-right: 12px;
    margin-bottom: 12px !important; // Ensure spacing for inline form
  }
}

.card-header {
  font-size: 1.1rem;
  font-weight: 600;
}

// Ensure cards in the row have consistent height if needed
.el-row .el-col .el-card {
  height: 100%;
}
</style>
