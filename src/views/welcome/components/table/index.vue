<script setup lang="ts">
import { defineProps, ref } from "vue"; // Import ref
import { useColumns } from "./columns";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import type { ElDialog } from "element-plus"; // Optional: Import type if needed

// Define props as before
const props = defineProps({
  coTableData: {
    type: Array as () => any[], // More specific type if possible
    default: () => []
  }
});

// Use the hook as before
const { loading, columns, dataList, pagination, Empty, onCurrentChange } =
  useColumns(props.coTableData);

// --- New code for Dialog ---
const dialogVisible = ref(false); // Controls dialog visibility
const currentRowDetails = ref<any | null>(null); // Holds data for the dialog

// Function to open the dialog and set the current row's data
const handleViewDetails = (row: any) => {
  currentRowDetails.value = row; // Store the row data
  dialogVisible.value = true; // Open the dialog
};
// --- End of new code for Dialog ---

console.log("Component Props:", props);
</script>

<template>
  <div>
    <pure-table
      row-key="id"
      alignWhole="center"
      showOverflowTooltip
      stripe
      :loading="loading"
      :loading-config="{ background: 'transparent' }"
      :data="
        dataList.slice(
          (pagination.currentPage - 1) * pagination.pageSize,
          pagination.currentPage * pagination.pageSize
        )
      "
      :columns="columns"
      :pagination="pagination"
      @page-current-change="onCurrentChange"
    >
      <template #empty>
        <el-empty description="暂无数据" :image-size="60">
          <template #image>
            <Empty />
          </template>
        </el-empty>
      </template>

      <template #operation="{ row }">
        <el-button
          plain
          circle
          size="small"
          :title="`查看序号为 ${row.id} 的详情`"
          :icon="useRenderIcon('ri:search-line')"
          @click="handleViewDetails(row)"
        />
      </template>
    </pure-table>

    <el-dialog
      v-model="dialogVisible"
      :title="`详情 (序号: ${currentRowDetails?.id ?? 'N/A'})`"
      width="500px"
      draggable
      destroy-on-close
    >
      <div v-if="currentRowDetails">
        <p><strong>类型:</strong> {{ currentRowDetails.type }}</p>
        <p><strong>经纪人:</strong> {{ currentRowDetails.agent }}</p>
        <p><strong>公寓/通勤地点:</strong> {{ currentRowDetails.location }}</p>
        <p><strong>预算:</strong> {{ currentRowDetails.budget }}</p>
        <p><strong>时段:</strong> {{ currentRowDetails.period }}</p>
        <p><strong>需求:</strong> {{ currentRowDetails.demand }}</p>
      </div>
      <div v-else>
        <p>无法加载详情数据。</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss">
/* Your existing styles */
.pure-table-filter {
  .el-table-filter__list {
    min-width: 80px;
    padding: 0;

    li {
      line-height: 28px;
    }
  }
}
</style>

<style lang="scss" scoped>
/* Your existing scoped styles */
:deep(.el-table) {
  --el-table-border: none;
  --el-table-border-color: transparent;

  .el-empty__description {
    margin: 0;
  }

  .el-scrollbar__bar {
    display: none;
  }
}

:deep(.el-dialog) {
  margin-top: 2vh;
}

/* Optional: Add some spacing inside the dialog */
.el-dialog__body p {
  margin-bottom: 10px;
  line-height: 1.6;
}

.el-dialog__body p strong {
  top: 0;
  margin-top: 0;
  margin-right: 8px;
  font-weight: bold;
}
</style>
